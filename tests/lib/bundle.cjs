'use strict';

/**
 * Compile a `src/**` entry with the repo's own esbuild and require the result.
 *
 * The gates must assert the CURRENT sources. A stored bundle (or a hand-copied
 * module) keeps asserting the behaviour it was written against after a refactor
 * changed the source — the exact failure these gates exist to catch.
 *
 * Compiled files land in a per-process temp directory and are removed on exit,
 * unless KEEP_BUNDLES=1 or the run failed (then the path is printed, so a red gate
 * can be inspected).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(os.tmpdir(), `logseq-pdf-extract-verify-${process.pid}`);

/**
 * @param {string} relEntry path relative to the repo root, e.g. 'src/utils/graph.ts'
 * @returns {{ mod: any, outfile: string }}
 */
function requireSource(relEntry) {
  const esbuild = require('esbuild');
  const entry = path.join(REPO_ROOT, relEntry);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outfile = path.join(OUT_DIR, path.basename(relEntry).replace(/\.ts$/, '') + '.cjs');
  esbuild.buildSync({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node14',
    logLevel: 'warning',
  });
  return { mod: require(outfile), outfile };
}

function cleanup() {
  const keep = process.env.KEEP_BUNDLES === '1' || process.exitCode;
  if (keep) {
    console.log(`  (compiled sources kept for inspection: ${OUT_DIR})`);
    return;
  }
  try {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
  } catch (e) {
    /* best effort: a leftover temp dir is not worth failing a gate over */
  }
}
process.on('exit', cleanup);

module.exports = { REPO_ROOT, requireSource, OUT_DIR };
