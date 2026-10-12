'use strict';

/**
 * The props object `Zotero.safeImportToCursor` builds for one item, as measured on
 * a real import (graph `zotan`, 2026-10-10: item 10.1103/n7tv-p5bp).
 *
 * Kept here so the template gate renders the shipped default against the field set
 * the importer actually fills: a default that references a key the importer never
 * supplies leaves `{{key}}` in the output, which the gate catches.
 *
 * Empty strings are part of the fixture on purpose — Zotero returns "" for fields
 * an item does not have, and the plugin must not write them.
 */
module.exports = {
  props: {
    'original-title': 'Algorithmic Quantum Simulations of Quantum Thermodynamics',
    title: '@Algorithmic Quantum Simulations of Quantum Thermodynamics',
    'item-type': '[[journalArticle]]',
    authors: '[[Yangsen Ye]], [[Jue Nan]]',
    tags: '[[quantum computing]]',
    date: '2026-9-23',
    year: '2026',
    journal: 'Physical Review Letters',
    'journal-abbreviation': 'Phys. Rev. Lett.',
    doi: 'https://doi.org/10.1103/n7tv-p5bp',
    url: 'https://link.aps.org/doi/10.1103/n7tv-p5bp',
    volume: '137',
    issue: '13',
    pages: '130603',
    publisher: '',
    links: '[Local library](zotero://select/library/items/N7VL37WQ)',
    ref: '[[@Algorithmic Quantum Simulations of Quantum Thermodynamics]]',
    pdfButton: '{{zotero-linked-file "qn/x.pdf"}}',
    abstract: '',
    alias: '',
  },
};
