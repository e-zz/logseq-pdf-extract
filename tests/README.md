# Regression gates

The plugin has no test framework and no runtime harness. The gates here are plain
Node scripts that assert the load-bearing behaviour of the code the recent fixes
touched, plus what the build actually emitted.

    yarn verify              # build, then run every gate
    yarn verify --no-build   # skip the build, assert the dist/ that is there
    yarn verify --strict     # a skipped layer becomes a failure

Each gate is also runnable on its own (they print a `#RESULT#` line that the
runner reads):

    node tests/db-prop-value.test.cjs

## What is covered

| Gate | Asserts |
|---|---|
| `dist.test.cjs` | The build emitted the fixed write path (tokens read out of `assets/*.js`), every `assets/` reference in `dist/index.html` is relative (`./…` — Logseq loads unpacked plugins from `lsp://`, where root-relative URLs 404), a CSS asset exists, and the pre-fix `getInfo().supportDb` fallback is gone. |
| `db-prop-value.test.cjs` | `dbPropValue()` / `toAbsoluteUrl()` keep every value written to a `url`-typed property acceptable to the DB worker's own validator; empty values are dropped rather than written; non-URL properties pass through untouched; `isRecycledPage()` classifies the live and recycled entity shapes. |
| `default-template.test.cjs` | Layer A: the shipped `insert_template` default (read out of `src/main.js`) renders through the plugin's own `Zotero.to_cursor_template` with every placeholder filled. Layer B: under mldoc — the parser DB graphs use — the comment line survives as one `Raw_Html` node and the heading still parses. |

Sources are compiled on the fly with the repo's own esbuild (`tests/lib/bundle.cjs`).
A stored bundle would keep asserting the behaviour the gate was written against
after a refactor changed it, which is the failure mode the gates exist to catch.

## What is NOT covered (say this out loud when reporting a green run)

- **No Logseq runtime and no GUI.** Nothing here loads the plugin into the app, so
  page creation, `Editor.restorePage`, the schema bootstrap transaction against a
  real DB graph, and the Zotero HTTP calls are unverified by these gates.
- **No typecheck.** The build is esbuild, which strips types; the repo has no `tsc`.
  A green `verify` is not a type-correctness statement.
- **The DB-worker validator is mirrored, not called.** `db-prop-value.test.cjs`
  reproduces the parse step of the predicate read out of the installed app
  (`new URL(v)` must not throw). The app's predicate also compares the parsed origin
  against an internal sentinel; that comparison is not reproduced here.
- **Layer B of the template gate needs mldoc.** It resolves `mldoc` from
  `LOGSEQ_REPO`'s `node_modules`, else this repo's `node_modules`. When neither
  exists the layer is skipped and reported — use `--strict` where that must fail.
  `mldoc` is deliberately not a dependency (the plugin never calls it). To give a
  machine the parser without touching `package.json`/`yarn.lock`:

      mkdir -p node_modules/mldoc
      curl -fsSL "$(npm view mldoc@1.5.9 dist.tarball)" | tar -xz --strip-components=1 -C node_modules/mldoc

  Its `index.js` is self-contained (no `require`s), so the extracted package runs
  as-is. `.github/workflows/verify.yml` does exactly this.

## Counter-example (mutation) check

    node tests/mutation-check.cjs

Breaks `dbPropValue()`'s URL branch in `src/utils/graph.ts` on purpose, asserts
`db-prop-value.test.cjs` goes red, restores the file and verifies its hash. A gate
that stays green under a broken source is decoration. The script refuses to run
while `src/utils/graph.ts` has uncommitted changes, so it can never overwrite work
in progress.
