'use strict';

/**
 * Gate: the DB-write path in src/utils/graph.ts.
 *
 * A `url`-typed DB property validates every value at transaction time; a value
 * that does not parse as an absolute URL is rejected ("Property validation
 * failed: \"doi\" should be a URL") and, before the fix, aborted the whole import
 * — every later property plus the abstract/attachment blocks were lost.
 *
 * The predicate below mirrors the one read out of the installed app
 * (app.asar, js/…/db-worker-node.js → `ynb`):
 *
 *     valid(v) = (() => { try { return new URL(v).origin !== SENTINEL } catch { return false } })()
 *
 * Only the parse step is reproduced here; the origin/sentinel comparison is not,
 * because the sentinel is the app's own internal "this was not a URL" marker and
 * never a value that arrives from Zotero.
 *
 * Run: node tests/db-prop-value.test.cjs
 */
const { createHarness, fatal } = require('./lib/harness.cjs');
const { requireSource } = require('./lib/bundle.cjs');

const GATE = 'db-prop-value';
const h = createHarness(GATE);
const { check } = h;

let graph;
try {
  graph = requireSource('src/utils/graph.ts').mod;
} catch (e) {
  fatal(GATE, e);
  process.exit(1);
}
const { dbPropValue, toAbsoluteUrl, isRecycledPage, URL_PROP_KEYS } = graph;

// mirror of the app's validator: new URL() must not throw
const isAcceptedAsUrl = (v) => {
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
};

// ---- 0. the list the schema and the normaliser share
check("URL_PROP_KEYS covers the url-typed keys", ['url', 'doi'].every((k) => URL_PROP_KEYS.includes(k)), true);

// ---- 1. the live failure from the user's graph (graph zotan, 2026-10-10T07:20:08Z)
const LOG_VALUE = '10.1103/n7tv-p5bp';
check('defect reproduced: raw bare DOI is NOT accepted by the DB worker', isAcceptedAsUrl(LOG_VALUE), false);
const fixed = dbPropValue('doi', LOG_VALUE);
check('doi: bare DOI -> doi.org URL', fixed, 'https://doi.org/10.1103/n7tv-p5bp');
check('doi: normalised value IS accepted by the DB worker', isAcceptedAsUrl(fixed), true);

// ---- 2. every value we hand to a url-typed property must pass the validator
const urlInputs = [
  'https://academic.oup.com/bib/article/doi/10.1093/bib/bbag274/8698814',
  'http://arxiv.org/abs/2502.10189v1',
  'arxiv.org/abs/2502.10189',
  '//example.org/x',
  'https://doi.org/10.1021/acs.jctc.6b01049',
  'doi:10.1103/PhysRevLett.109.186404',
  'mailto:someone@example.org',
  '10.1038/s41534-026-01369-x',
  '10.1103/n7tv-p5bp',
];
for (const input of urlInputs) {
  for (const key of URL_PROP_KEYS) {
    const out = dbPropValue(key, input);
    check(
      `${key}: "${input}" -> ${JSON.stringify(out)} passes the DB worker rule`,
      out === undefined ? 'skipped' : isAcceptedAsUrl(out),
      true
    );
  }
}
check('url: absolute URL untouched', dbPropValue('url', 'http://arxiv.org/abs/2502.10189v1'), 'http://arxiv.org/abs/2502.10189v1');
check('url: scheme added when missing', dbPropValue('url', 'arxiv.org/abs/2502.10189'), 'https://arxiv.org/abs/2502.10189');
check('url: protocol-relative gets https', dbPropValue('url', '//example.org/x'), 'https://example.org/x');
check('doi: dx.doi.org prefix re-canonicalised', dbPropValue('doi', 'https://dx.doi.org/10.1103/x'), 'https://doi.org/10.1103/x');
check("doi: 'doi:' prefix stripped", dbPropValue('doi', 'doi: 10.1103/x'), 'https://doi.org/10.1103/x');
check('doi: idempotent', dbPropValue('doi', 'https://doi.org/10.1103/x'), 'https://doi.org/10.1103/x');

// ---- 3. absent / empty values must never be written
for (const key of ['doi', 'url', 'authors', 'tags', 'date', 'volume', 'item-type']) {
  check(`${key}: undefined -> skipped`, dbPropValue(key, undefined), undefined);
  check(`${key}: null -> skipped`, dbPropValue(key, null), undefined);
  check(`${key}: "" -> skipped`, dbPropValue(key, ''), undefined);
  check(`${key}: "   " -> skipped`, dbPropValue(key, '   '), undefined);
}

// ---- 4. non-URL properties keep the Zotero value untouched
check('authors: [[refs]] list untouched', dbPropValue('authors', '[[Yangsen Ye]], [[Jue Nan]]'), '[[Yangsen Ye]], [[Jue Nan]]');
check('date: non-padded Zotero date untouched', dbPropValue('date', '2026-9-23'), '2026-9-23');
check('volume: string untouched', dbPropValue('volume', '137'), '137');
check(
  'links: markdown untouched',
  dbPropValue('links', '[Local library](zotero://select/library/items/N7VL37WQ)'),
  '[Local library](zotero://select/library/items/N7VL37WQ)'
);
check('year: number passes through', dbPropValue('year', 2026), 2026);
check('boolean passes through', dbPropValue('item-type', false), false);
// a bare DOI on a *non*-url key must stay bare (e.g. text-typed doi in an older graph)
check('text-typed key keeps bare value', dbPropValue('citationkey', '10.1103/x'), '10.1103/x');

check('toAbsoluteUrl(doi) helper', toAbsoluteUrl('10.1103/x', { doi: true }), 'https://doi.org/10.1103/x');
check('toAbsoluteUrl(empty)', toAbsoluteUrl(''), '');

// ---- 5. recycle-bin predicate (a deleted generation keeps the page name)
// Real shapes: an ACTIVE entity as returned for a live page on 2.0.2 (no delete
// marker) vs the RECYCLED entity (created-at/updated-at + deleted-at + original-page).
const ACTIVE_PAGE = {
  uuid: '87326a54-1dbe-4839-b27d-bce5c34fd592',
  name: 'algorithmic quantum simulations of quantum thermodynamics',
  title: 'Algorithmic Quantum Simulations of Quantum Thermodynamics',
  'created-at': 1790427700017,
  'updated-at': 1790427700017,
};
const RECYCLED_PAGE = {
  uuid: '6ac9e728-dbae-4db9-9610-de8f1e801ad2',
  name: '@algorithmic quantum simulations of quantum thermodynamics',
  'created-at': 1791616808230,
  'updated-at': 1791616808627,
  'deleted-at': 1791649245758,
  'original-page': { id: 60178 },
  order: 'aH',
};
check('isRecycledPage(live page) === false', isRecycledPage(ACTIVE_PAGE), false);
check('isRecycledPage(recycled page) === true', isRecycledPage(RECYCLED_PAGE), true);
check('isRecycledPage(undefined/null)', [isRecycledPage(undefined), isRecycledPage(null)], [false, false]);
check('isRecycledPage(camelCase variant)', isRecycledPage({ uuid: 'x', deletedAt: 1 }), true);
check('isRecycledPage(nested properties variant)', isRecycledPage({ uuid: 'x', properties: { 'deleted-at': 1 } }), true);
check('isRecycledPage(unknown marker spelling)', isRecycledPage({ uuid: 'x', deleted_at: 1 }), true);
check('isRecycledPage(namespaced nested marker)', isRecycledPage({ uuid: 'x', properties: { 'logseq.property/deleted-at': 1 } }), true);
check(
  'isRecycledPage(live page with plugin props)',
  isRecycledPage({
    uuid: '6ac9e728-dbae-4db9-9610-de8f1e801ad2',
    name: '@x',
    title: 'x',
    refs: [],
    tags: [],
    properties: {
      ':plugin.property.logseq-pdf-extract/date': 1,
      ':plugin.property.logseq-pdf-extract/doi': 'https://doi.org/10.1/x',
    },
  }),
  false
);
check('isRecycledPage(explicit null marker) === false', isRecycledPage({ uuid: 'x', 'deleted-at': null }), false);

h.report();
