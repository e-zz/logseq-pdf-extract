'use strict';

/**
 * Gate: what the build actually emitted.
 *
 * A green build is not proof that the fix is in the bundle: a stale/reused asset, a
 * wrong entry point or an edit that never reached the source all produce a green
 * build. This gate reads dist/index.html, follows the emitted assets, and asserts
 * the fixed write path is present (and the pre-fix fallback is gone).
 *
 * Run: node tests/dist.test.cjs   (after a build — `yarn verify` builds first)
 */
const fs = require('fs');
const path = require('path');
const { createHarness, fatal } = require('./lib/harness.cjs');

const GATE = 'dist';
const h = createHarness(GATE);
const { check } = h;

const dist = path.join(__dirname, '..', 'dist');
const htmlPath = path.join(dist, 'index.html');

try {
  fs.statSync(htmlPath);
} catch (e) {
  fatal(GATE, new Error(`no ${htmlPath} — run the build first (yarn build, or yarn verify without --no-build)`));
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
const assetRefs = refs.filter((r) => r.includes('assets/'));
console.log(`  assets referenced: ${assetRefs.join(', ') || '(none)'}`);

// Logseq loads unpacked plugins from an lsp:// origin: a root-relative /assets/…
// resolves to lsp://logseq.com/assets/… and 404s. Vite must emit ./assets/….
const notRelative = assetRefs.filter((r) => !r.startsWith('./'));
const missing = assetRefs.filter((r) => !fs.existsSync(path.join(dist, r)));
check('every assets/ reference is relative (./)', notRelative, []);
check('every referenced asset exists in dist/', missing, []);

const jsRef = assetRefs.find((r) => r.endsWith('.js'));
const cssRef = assetRefs.find((r) => r.endsWith('.css'));
check('a JS asset is referenced', !!jsRef, true);
check('a CSS asset is referenced', !!cssRef, true);
if (!jsRef) {
  h.report();
  return;
}
const bundle = fs.readFileSync(path.join(dist, jsRef), 'utf8');

// Tokens of the fixed write path. Each one is a piece of code the fix introduced;
// their absence means the bundle does not contain the fix.
const mustContain = [
  ['doi.org canonicalisation', 'https://doi.org/'],
  ['per-property failure report', 'propert'],
  ['skip report wording', 'skipped ('],
  ['write-failure log', 'could not set property'],
  ['schema ident namespace', 'plugin.property.logseq-pdf-extract/'],
  ['async supportDb fallback', 'getInfo'],
  ['recycle-bin guard: restore call', 'restorePage'],
  ['recycle-bin guard: user message', 'is in the recycle bin'],
  ['default template: self-describing comment', 'Default template. Edit it in the plugin settings'],
];
for (const [label, token] of mustContain) {
  check(`bundle has ${label}`, bundle.includes(token), true);
}

// The pre-fix fallback read `.supportDb` off an unawaited Promise, so it was always
// falsy and silently reported a DB graph as a file graph.
check('stale getInfo().supportDb fallback is gone', /getInfo\(\)\.supportDb|getInfo\?\.\(\)\.supportDb/.test(bundle), false);

h.report();
