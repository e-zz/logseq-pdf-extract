# DB version (DB graph) port plan

Branch: `feat/db-version-support`
Goal: make the plugin work on Logseq **DB graphs** as well as file (MD) graphs, without regressing MD behavior.

Recon date: 2026-09-21. Line numbers refer to commit `74ccd66` (v0.3.0).

## Why this is needed (measured facts)

| fact | evidence |
|---|---|
| No graph-type detection anywhere | `grep -rn 'checkCurrentIsDbGraph\|supportDb\|isDbGraph' src` → 0 hits |
| SDK too old to expose DB APIs | `package.json:12` → `@logseq/libs ^0.0.15`; DB property APIs (`upsertProperty`, `getAllProperties`, `createTag`, `checkCurrentIsDbGraph`) appeared in later 0.3.x SDKs |
| Page alias is written as **block text**, not a property | `src/zotero/page.ts:186-207` `updateAlias()` builds `alias:: <key>` and writes it with `updateBlock`; the comment at :187 deliberately avoids `upsertBlockProperty`. On DB graphs an `alias::` line in block text is **not** a property, so aliases never register |
| Highlight props are written as **text** | `src/utils/extractBlock.ts:52` → `prop_uuid = \`\n${prop}:: ${ref}\n\`` (file-graph idiom); reads at :55-56 already use `getBlockProperty` |
| One raw datascript query | `logseq.DB.datascriptQuery` (1 call site) — semantics differ on DB graphs |
| Page creation passes props + file-graph `format` | `src/zotero/page.ts:59-65` (`createPage(title, props, {format: App.getUserConfigs()['prefferedFormat']})`), :231 |
| Partly DB-ready already | `upsertBlockProperty` for `ocr` (`src/utils/ocrLib.ts:15`), `getBlockProperty` reads, and the PDF button already emits the DB-compatible macro `{{zotero-linked-file "<relpath>"}}` (`src/zotero/attachment.ts:3`, `src/utils/pdfOpenButton.ts:68`) |

Note: `{{zotero-linked-file}}` is resolved by Logseq itself against the graph config
`:zotero/settings-v2 {"default" {:zotero-linked-attachment-base-directory …}}`, so the PDF button
designed here is already the right mechanism on DB graphs (verified in a DB graph, 2026-09-21).

## P0 — infrastructure

1. **Bump the SDK**: `@logseq/libs` → `^0.3.x` (latest), reinstall, refresh typings
   (`src/typings/`), fix any type fallout. Needed for every DB API below.
2. **`src/utils/graph.ts`** (new): `isDbGraph()` cached once per session
   (`App.checkCurrentIsDbGraph()`, fallback `App.getInfo().supportDb`), plus
   `setProp(blockOrPageUuid, key, value, {reset})` that routes DB → `Editor.upsertBlockProperty`
   and MD → the existing text path. All property writes go through this helper.
3. **Schema bootstrap for DB graphs**: a command ("Add PDF Extract schema") that
   `upsertProperty`s the fields the plugin writes, with sensible types
   (`date` for date/year, `node`/`many` for tags+creators, `url` for url/doi links, `default`
   otherwise) — same pattern as zoterolocal's "Add Zotero schema to Logseq". Without a schema,
   DB properties land untyped and some UI/query behavior differs.

## P1 — critical paths

4. `src/zotero/page.ts` `updateAlias()`: add a DB branch
   (`upsertBlockProperty(page.uuid, 'alias', '[[citekey]]')`); keep the MD text branch as-is
   (and keep the existing comment as the rationale for the MD path).
5. `src/zotero/page.ts` `createPage()`: on DB graphs, create the page first and then set each
   property through the DB API instead of relying on the properties argument + `format` option
   (`format` is a file-graph concept). Guard by graph type; MD path unchanged.
6. `src/zotero/page.ts` `importAbstract()` / `importAttachments()`: verify on a DB graph —
   the `[[Abstract]]` / `[[Attachments]]` headings become page references there. Acceptable, but
   if they render oddly, switch to plain-text headings on DB graphs.
7. `src/utils/extractBlock.ts`: route the `prop:: value` writes through `setProp()`
   (DB → `upsertBlockProperty`); keep the text path for MD.
8. The single `datascriptQuery` call site: check DB-graph behavior; either port the query to the
   DB schema or guard it behind a capability check.

## P2 — verification

9. Build (`yarn build` / `npm run build`) and load the built plugin in a **DB graph**:
   - import an item whose PDF is a linked attachment → page created, metadata present as
     **typed properties**, PDF button macro present and clickable (resolves to the linked PDF);
   - `alias` shows up as a real alias property, not as text;
   - annotation/highlight extraction writes its properties as properties;
   - OCR property write still works.
10. Re-test the same flow in an **MD graph** to confirm no regression (all DB branches guarded).
11. Keep `dist/` out of commits unless a release is intended; tag a version when the DB path is
    verified (marketplace release process unchanged).

## Open questions

- Does `createPage`'s properties argument map onto DB property entities in the current SDK, or is
  explicit `upsertProperty` + `upsertBlockProperty` required in all cases? (Verify empirically on a
  DB graph before writing the final shape of P1.5.)
- Do the plugin's own template placeholders (`{{title}} {{year}} {{journal}} {{pdfButton}} …`,
  `src/main.js:154-172`) need any DB-specific handling? The PDF button is already fine; text
  placeholders are graph-agnostic.
