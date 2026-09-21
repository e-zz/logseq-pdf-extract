/**
 * Graph-type detection + property-write routing.
 *
 * Logseq file (Markdown) graphs and DB graphs store properties differently:
 *  - MD graphs: `prop:: value` lines in the block *text* are the property mechanism.
 *  - DB graphs: properties are typed entities set via the Editor API
 *    (upsertBlockProperty / upsertProperty); a `prop:: value` line inside block
 *    text is just text and never registers as a property.
 *
 * Every property write in the plugin should go through `setProp` so the two
 * graph types reuse one path. All DB-specific behaviour must be guarded by
 * `isDbGraph()`.
 */

let _isDbGraph: boolean | null = null;

/**
 * Whether the current graph is a Logseq DB graph (as opposed to a file / MD graph).
 * Result is cached for the session. Falls back to `App.getInfo().supportDb` if
 * `checkCurrentIsDbGraph` is unavailable.
 */
export async function isDbGraph(): Promise<boolean> {
  if (_isDbGraph != null) return _isDbGraph;
  try {
    if (typeof logseq.App.checkCurrentIsDbGraph === "function") {
      _isDbGraph = !!(await logseq.App.checkCurrentIsDbGraph());
    } else {
      _isDbGraph = !!(logseq.App.getInfo?.().supportDb);
    }
  } catch (e) {
    console.error("[graph] isDbGraph failed, defaulting to supportDb", e);
    _isDbGraph = !!(logseq.App.getInfo?.().supportDb);
  }
  return _isDbGraph;
}

/**
 * Write `key` as a property on the given block (its uuid or page name/identity).
 * On DB graphs this routes to `Editor.upsertBlockProperty`; on MD graphs it
 * keeps the existing block-text `key:: value` mechanism (so MD behaviour is
 * unchanged).
 *
 * @param blockOrPageUuid block uuid, or page identity string
 * @param key property key
 * @param value property value
 * @param opts.reset reset the value (DB API option) instead of appending
 */
export async function setProp(
  blockOrPageUuid: string,
  key: string,
  value: any,
  opts: { reset?: boolean } = {},
): Promise<void> {
  const db = await isDbGraph();
  if (db) {
    await logseq.Editor.upsertBlockProperty(blockOrPageUuid, key, value, {
      reset: opts.reset ?? false,
    });
    return;
  }

  // MD graph: write `key:: value` as an editor-only line in the target block's
  // text. Mirrors the existing `updateAlias` text path (see page.ts). A page
  // uuid resolves to the page's first block on MD graphs.
  const block = await logseq.Editor.getBlock(blockOrPageUuid);
  if (!block) return;

  let content = block.content;
  const marker = `${key}::`;
  if (!content.includes(marker)) {
    content = `${key}:: ${String(value)}\n${content}`;
  } else {
    content = content
      .split("\n")
      .map((line) => {
        if (line.includes(marker)) {
          if (opts.reset) {
            return `${key}:: ${String(value)}`;
          }
          if (!line.includes(String(value))) {
            line += ` ${String(value)}`;
          }
        }
        return line;
      })
      .join("\n");
  }
  await logseq.Editor.updateBlock(block.uuid, content);
}