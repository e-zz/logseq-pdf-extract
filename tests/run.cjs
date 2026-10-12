#!/usr/bin/env node
'use strict';

/**
 * `yarn verify` entry point: build the plugin, then run every gate in this directory.
 *
 *   node tests/run.cjs [--no-build] [--strict]
 *
 * --no-build  assert the dist/ already on disk (CI builds in its own step)
 * --strict    treat a SKIPPED layer as a failure
 *
 * Gates run as child processes, so one aborting cannot hide another's result.
 * See tests/README.md for what the gates do and do not cover.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const GATES = ['dist.test.cjs', 'db-prop-value.test.cjs', 'default-template.test.cjs'];
const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const strict = args.includes('--strict');

function resolveVite() {
  const candidates = [];
  try {
    candidates.push(require.resolve('vite/bin/vite.js'));
  } catch (e) {
    /* fall through to the path guess */
  }
  candidates.push(path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'));
  return candidates.find((p) => fs.existsSync(p)) || null;
}

if (!noBuild) {
  const viteBin = resolveVite();
  if (!viteBin) {
    console.error(
      'verify: vite not found. Note that an install run with NODE_ENV=production prunes\n' +
        '        devDependencies (which is where the whole build toolchain lives); re-run\n' +
        '        `NODE_ENV=development yarn install --check-files`.'
    );
    process.exit(1);
  }
  console.log('→ build');
  const built = spawnSync(process.execPath, [viteBin, 'build'], { cwd: ROOT, stdio: 'inherit' });
  if (built.status !== 0) {
    console.error(`verify: build failed (exit ${built.status})`);
    process.exit(1);
  }
}

const results = [];
for (const gate of GATES) {
  console.log(`\n→ ${gate}`);
  const run = spawnSync(process.execPath, [path.join(__dirname, gate)], { cwd: ROOT, encoding: 'utf8' });
  process.stdout.write(run.stdout || '');
  if (run.stderr) process.stderr.write(run.stderr);

  const line = (run.stdout || '')
    .split('\n')
    .reverse()
    .find((l) => l.startsWith('#RESULT# '));
  let result = null;
  if (line) {
    try {
      result = JSON.parse(line.slice('#RESULT# '.length));
    } catch (e) {
      result = null;
    }
  }
  results.push(result || { gate, pass: 0, failed: 1, skips: [], crashed: true });
}

const failed = results.filter((r) => r.failed > 0 || r.crashed);
const skipped = results.flatMap((r) => (r.skips || []).map((s) => `${r.gate}: ${s}`));

console.log('\nverify summary');
for (const r of results) {
  const status = r.crashed ? 'CRASHED' : r.failed > 0 ? 'FAIL' : 'PASS';
  const skippedNote = r.skips && r.skips.length ? `, ${r.skips.length} layer(s) skipped` : '';
  console.log(`  ${status.padEnd(7)} ${String(r.gate).padEnd(22)} ${r.pass} assertion(s)${skippedNote}`);
}
if (skipped.length) {
  console.log('\nDEGRADED — these layers did NOT run:');
  for (const s of skipped) console.log(`  ! ${s}`);
}

if (failed.length) {
  console.log(`\nverify: FAIL (${failed.length}/${results.length} gate(s))`);
  process.exit(1);
}
if (skipped.length && strict) {
  console.log('\nverify: FAIL (--strict: a layer was skipped)');
  process.exit(1);
}
console.log(`\nverify: PASS (${results.length} gate(s)${skipped.length ? ', DEGRADED as listed above' : ''})`);
