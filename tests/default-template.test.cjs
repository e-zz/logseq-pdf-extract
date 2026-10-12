'use strict';

/**
 * Gate: the shipped default `insert_template` and how it renders.
 *
 * Layer A — the plugin's own renderer, `Zotero.to_cursor_template`, fills the
 *   shipped default (read out of the settings schema in src/main.js) with every
 *   placeholder resolved.
 * Layer B — mldoc, the parser Logseq DB graphs use, keeps the first line as a
 *   `Raw_Html` node with its text intact and still parses the heading. The claim
 *   "the comment stays invisible in the rendered page" rests on this and was
 *   measured against mldoc 1.5.9.
 *
 * Run: node tests/default-template.test.cjs
 *      [LOGSEQ_REPO=D:/Action/logseq]   # where to find mldoc
 */
const fs = require('fs');
const path = require('path');
const { createHarness, fatal } = require('./lib/harness.cjs');
const { REPO_ROOT, requireSource } = require('./lib/bundle.cjs');
const { props } = require('./fixtures/item-props.cjs');

const GATE = 'default-template';
const MEASURED_MLDOC = '1.5.9';
const h = createHarness(GATE);
const { check } = h;

// The plugin modules read `logseq.settings` while they are imported, so a stub has
// to be in place before the bundle is required.
globalThis.logseq = {
  onSettingsChanged() {},
  settings: {},
  UI: { showMsg() {} },
  App: { getUserConfigs: () => ({ prefferedFormat: 'markdown' }) },
  Editor: {},
};

/**
 * Read the default template out of the settings schema in src/main.js.
 * Text-level on purpose: src/main.js imports the Vue app, so it cannot be bundled
 * into a Node process. `dist.test.cjs` asserts the same text reached the bundle.
 */
function readShippedDefaultTemplate() {
  const MARKER = 'default: `';
  const src = fs.readFileSync(path.join(REPO_ROOT, 'src', 'main.js'), 'utf8');
  const keyAt = src.indexOf("key: 'insert_template'");
  if (keyAt < 0) throw new Error("src/main.js: no `key: 'insert_template'` setting found");
  const open = src.indexOf(MARKER, keyAt);
  if (open < 0) throw new Error('src/main.js: insert_template has no default template literal');
  const start = open + MARKER.length;
  const end = src.indexOf('`', start);
  if (end < 0) throw new Error('src/main.js: unterminated default template literal');
  return src.slice(start, end);
}

/** mldoc is not a dependency of the plugin; use the Logseq checkout when given. */
function resolveMldoc() {
  const candidates = [
    process.env.LOGSEQ_REPO && path.join(process.env.LOGSEQ_REPO, 'node_modules', 'mldoc'),
    path.join(REPO_ROOT, 'node_modules', 'mldoc'),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

const MLDOC_CONFIG = JSON.stringify({
  toc: false,
  parse_outline_only: false,
  heading_number: false,
  keep_line_break: true,
  format: 'Markdown',
  heading_to_list: false,
  enable_drawers: false,
  parse_marker: false,
  parse_priority: false,
});

let Zotero;
let template;
try {
  ({ Zotero } = requireSource('src/zotero/zotero.ts').mod);
  template = readShippedDefaultTemplate();
} catch (e) {
  fatal(GATE, e);
  process.exit(1);
}

(async () => {
  const skips = [];
  const firstLine = template.split(/\r?\n/)[0];

  // ---- Layer A: the shipped default + the real renderer
  check('shipped default: first line is an HTML comment', /^<!--.*-->$/.test(firstLine), true);
  check('shipped default: the comment names the setting', firstLine.includes('Template for Zotero items'), true);
  check('shipped default: title heading present', template.includes('# {{title}}'), true);
  const placeholders = [...template.matchAll(/{{([\w-]+)}}/g)].map((m) => m[1]);
  check('shipped default: every placeholder is a key the importer fills', placeholders.filter((k) => !(k in props)), []);

  const out = await Zotero.to_cursor_template(props, template);
  check('comment line survives rendering', out.split(/\r?\n/)[0], firstLine);
  check('no unfilled placeholders left', /{{[\w-]+}}/.test(out), false);
  check('title filled', out.includes('# @Algorithmic Quantum Simulations of Quantum Thermodynamics'), true);
  check('doi is the URL form', out.includes('**DOI**: https://doi.org/10.1103/n7tv-p5bp'), true);
  check('pdfButton macro intact', out.includes('{{zotero-linked-file "qn/x.pdf"}}'), true);
  check('no "template not filled" error', out.includes('template not filled'), false);

  // ---- Layer B: what Logseq's own parser makes of that text
  const mldocDir = resolveMldoc();
  if (!mldocDir) {
    skips.push(
      'mldoc layer: no mldoc found — point LOGSEQ_REPO at a Logseq checkout, or fetch the pinned parser without touching package.json/lockfile:\n' +
        '        mkdir -p node_modules/mldoc && curl -fsSL "$(npm view mldoc@' +
        MEASURED_MLDOC +
        ' dist.tarball)" | tar -xz --strip-components=1 -C node_modules/mldoc'
    );
  } else {
    const mldocVersion = require(path.join(mldocDir, 'package.json')).version;
    console.log(`  mldoc ${mldocVersion} (claim measured on ${MEASURED_MLDOC}) at ${mldocDir}`);
    const { Mldoc } = require(mldocDir);

    const ast = JSON.parse(Mldoc.parseJson(out, MLDOC_CONFIG));
    const flat = (n) => {
      const o = [];
      const walk = (x) => {
        if (Array.isArray(x)) {
          if (typeof x[0] === 'string') o.push(x[0]);
          x.forEach(walk);
        }
      };
      walk(n);
      return o;
    };
    const nodes = flat(ast);
    check('mldoc: first node is Raw_Html', nodes[0], 'Raw_Html');
    const rawHtml = ast[0][0][1];
    check('mldoc: comment text preserved', rawHtml.includes('Default template'), true);
    check('mldoc: comment text unchanged', rawHtml, firstLine);
    check('mldoc: heading still parsed', nodes.includes('Heading'), true);
    check('mldoc: exactly one Raw_Html node', nodes.filter((t) => t === 'Raw_Html').length, 1);
    if (mldocVersion !== MEASURED_MLDOC) {
      skips.push(
        `mldoc layer ran against ${mldocVersion}, not the measured ${MEASURED_MLDOC} — re-measure before trusting the invisibility claim`
      );
    }
  }

  h.report(skips);
})();
