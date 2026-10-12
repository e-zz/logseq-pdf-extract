'use strict';

/**
 * Counter-example (mutation) check: prove the gate is sensitive.
 *
 * A gate that stays green while the code it guards is broken is decoration. This
 * script disables `dbPropValue()`'s url-typed branch in src/utils/graph.ts, asserts
 * that db-prop-value.test.cjs FAILS on the bare-DOI assertion, then restores the
 * file byte-for-byte and verifies the hash.
 *
 * Scope: ONE mutation. It shows the gate detects a disabled URL branch; it is not
 * mutation testing of the whole module.
 *
 * Safety: refuses to run while src/utils/graph.ts has uncommitted changes, so it can
 * never overwrite work in progress. If this process is killed mid-run, recover with
 *   git checkout -- src/utils/graph.ts
 *
 * Run: node tests/mutation-check.cjs
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'src', 'utils', 'graph.ts');
const REL_TARGET = path.relative(ROOT, TARGET).replace(/\\/g, '/');
const GATE = path.join(__dirname, 'db-prop-value.test.cjs');

// Working-tree files are CRLF on Windows (core.autocrlf=true, no .gitattributes),
// so the anchor has to be newline-agnostic.
const ANCHOR_RE =
  /export function dbPropValue\(key: string, value: any\): any \{\r?\n  if \(value == null\) return undefined;/;
const MUTATION_LINE = '  if (URL_PROP_KEYS.includes(key)) return value; // MUTATION: counter-example check';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const status = spawnSync('git', ['status', '--porcelain', '--', REL_TARGET], { cwd: ROOT, encoding: 'utf8' });
if (status.error || status.status !== 0) {
  console.error('mutation-check: cannot check git status —', (status.error && status.error.message) || status.stderr);
  process.exit(1);
}
if ((status.stdout || '').trim() !== '') {
  console.error(`mutation-check: refusing to run — ${REL_TARGET} has uncommitted changes:`);
  console.error(status.stdout.trim());
  process.exit(1);
}

const original = fs.readFileSync(TARGET);
const before = sha256(original);
const backup = path.join(os.tmpdir(), `graph.ts.${process.pid}.bak`);
fs.writeFileSync(backup, original);
console.log(`mutation-check: ${REL_TARGET} sha256 ${before}`);
console.log(`mutation-check: backup ${backup}`);
console.log(`mutation-check: recovery if killed mid-run: git checkout -- ${REL_TARGET}`);

let verdict = 1;
try {
  const text = original.toString('utf8');
  const match = text.match(ANCHOR_RE);
  if (!match) throw new Error('anchor not found — update this script, not the source');
  const nl = match[0].includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(TARGET, text.replace(ANCHOR_RE, match[0] + nl + nl + MUTATION_LINE));
  console.log('mutation-check: url-typed branch disabled, running tests/db-prop-value.test.cjs …');

  const run = spawnSync(process.execPath, [GATE], { cwd: ROOT, encoding: 'utf8' });
  const out = `${run.stdout || ''}${run.stderr || ''}`;
  const detected = run.status !== 0 && /bare DOI -> doi\.org URL/.test(out);
  console.log(`mutation-check: gate exit=${run.status}, bare-DOI assertion failed=${detected}`);
  if (detected) {
    console.log('mutation-check: PASS — the gate went red on the disabled URL branch');
    verdict = 0;
  } else {
    console.log('mutation-check: FAIL — the gate stayed green under a broken source');
    console.log(out.split('\n').slice(0, 25).join('\n'));
  }
} catch (e) {
  console.error('mutation-check: aborted —', e.message);
} finally {
  fs.writeFileSync(TARGET, original);
  const after = sha256(fs.readFileSync(TARGET));
  if (after === before) {
    console.log(`mutation-check: restored (sha256 ${after}, unchanged)`);
  } else {
    console.error(`mutation-check: !! RESTORE MISMATCH — expected ${before}, got ${after}`);
    console.error(`mutation-check: !! recover with: git checkout -- ${REL_TARGET}   (backup: ${backup})`);
    verdict = 1;
  }
}
process.exit(verdict);
