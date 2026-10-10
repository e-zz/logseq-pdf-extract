/// <reference types="@logseq/libs" />

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
 * Property keys that are registered as `url`-typed DB properties (see
 * `addPdfExtractSchema`, which imports this list). The DB worker validates
 * every value written to them: a string that does not parse as an absolute
 * URL is rejected at transaction time and the write fails, e.g.
 *
 *   Property validation failed: "doi" should be a URL   (value: 10.1103/n7tv-p5bp)
 *
 * Zotero stores DOIs bare ("10.1103/n7tv-p5bp") and its local API returns the
 * raw `url` field as-is, so both must be normalised before writing.
 */
export const URL_PROP_KEYS = ["url", "doi"];

/** `doi:`, `https://doi.org/`, `https://dx.doi.org/` prefixes on a DOI value. */
const DOI_PREFIX = /^(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)/i;
/** An already-absolute URL carrying an authority (`scheme://…`). */
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;
/** Any scheme at all, including authority-less ones (`mailto:`, `data:`, …). */
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Coerce a value into something the DB worker accepts for a `url`-typed
 * property. Anything already URL-shaped is left alone; the rest gets an
 * `https://` scheme, because a bare host/path is not parseable as a URL.
 *
 * @param opts.doi treat a scheme-less value as a DOI and resolve it via doi.org
 */
export function toAbsoluteUrl(value: any, opts: { doi?: boolean } = {}): string {
  const raw = String(value ?? "").trim();
  if (raw === "") return "";
  if (DOI_PREFIX.test(raw)) return `https://doi.org/${raw.replace(DOI_PREFIX, "")}`;
  if (opts.doi) return `https://doi.org/${raw}`;
  if (ABSOLUTE_URL.test(raw) || ANY_SCHEME.test(raw)) return raw;
  return raw.startsWith("//") ? `https:${raw}` : `https://${raw}`;
}

/**
 * Turn one Zotero property value into a value the DB API will accept, or
 * `undefined` when the value carries no information and must not be written.
 *
 * Two failure modes are handled here, both seen in the wild:
 *  - empty value (Zotero omits some fields, returns "" for others): writing it
 *    produces an empty property at best and an invalid-value error at worst;
 *  - non-URL value for a `url`-typed property (bare DOI): the write is rejected
 *    and, without this, aborts the whole import (see `setPageProps`).
 *
 * Values of non-URL properties are returned untouched, so what lands on the
 * page is what Zotero gave us.
 */
export function dbPropValue(key: string, value: any): any {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  if (URL_PROP_KEYS.includes(key)) {
    const url = toAbsoluteUrl(trimmed, { doi: key === "doi" });
    return url === "" ? undefined : url;
  }
  return value;
}

/**
 * Whether a page entity is in the recycle bin (Logseq marks it with
 * `:logseq.property/deleted-at`).
 *
 * DB graphs keep deleted pages, and `Editor.getPage(name)` still resolves them
 * by name — so every "does this page exist?" test must exclude them. Field name
 * is read tolerantly (`deleted-at` / `deletedAt`, plain or under `properties`)
 * because the plugin API does not declare it in `PageEntity`; an active page
 * carries none of these (checked against live entities on 2.0.2).
 */
export function isRecycledPage(page: any): boolean {
  if (!page) return false;
  const marker =
    page["deleted-at"] ??
    page.deletedAt ??
    page.properties?.["deleted-at"] ??
    page.properties?.deletedAt;
  return marker != null;
}

/**
 * `App.getInfo()` returns a Promise: reading `.supportDb` straight off the call
 * is always falsy, which would silently report a DB graph as a file graph.
 * Fallback for builds without `checkCurrentIsDbGraph`.
 */
async function supportDbFallback(): Promise<boolean> {
  try {
    const info = await logseq.App.getInfo?.();
    return !!(info && (info as any).supportDb);
  } catch (e) {
    console.error("[graph] App.getInfo failed", e);
    return false;
  }
}

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
      _isDbGraph = await supportDbFallback();
    }
  } catch (e) {
    console.error("[graph] isDbGraph failed, defaulting to supportDb", e);
    _isDbGraph = await supportDbFallback();
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