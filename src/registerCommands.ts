import { buttonFromClipboard } from "./utils/pdfOpenButton"
import { importSelectedToCursor } from './zotero/zotero'

import { extractEditor } from "./utils/extractBlock";
import { isDbGraph } from "./utils/graph";

const __debug = false;


function showSearchPanel() {
  logseq.showMainUI();
  return null
}

/**
 * DB graphs store property *schemas* as first-class entities. Without a schema,
 * a property written via upsertBlockProperty lands untyped, which changes some
 * UI/query behaviour (e.g. date-backed filters, node type, multi-value tags).
 * This mirrors zoterolocal's "Add Zotero schema" command: create via
 * Editor.upsertProperty with a sensible type/cardinality for each field the
 * plugin writes. MD graphs have no schema concept, so this is a no-op there.
 *
 * Invoked automatically on load (DB graphs only) and on demand via the
 * "PDF: Add PDF Extract schema to this graph" command.
 */
export async function addPdfExtractSchema() {
  if (!(await isDbGraph())) {
    logseq.UI.showMsg("PDF Extract: schema bootstrap only applies to DB graphs", "warning");
    return;
  }

  // key -> {type, cardinality}. Everything the plugin writes as a property.
  // Type assignments follow the proven zoterolocal pattern (works on this graph):
  //   node+many  for multi-ref fields, date for calendar dates, url for links,
  //   plain default otherwise (no forced cardinality on default/url).
  const dateFields = ["date", "date-added", "date-modified"];
  const nodeFieldsMany = ["authors", "tags", "creators"];
  const urlFields = ["url", "doi"];

  const schemaFor = (key: string) => {
    if (dateFields.includes(key)) return { type: "date" as const, cardinality: "one" as const };
    if (nodeFieldsMany.includes(key)) return { type: "node" as const, cardinality: "many" as const };
    if (urlFields.includes(key)) return { type: "url" as const, cardinality: "one" as const };
    return { type: "default" as const };
  };

  const fields = [
    // page metadata (src/zotero/page.ts fromRaw)
    "original-title", "title", "item-type", "authors", "tags", "citationKey",
    "links", "alias", "year", "journal", "journal-abbreviation", "doi", "url",
    "volume", "issue", "pages", "publisher", "date", "date-added", "date-modified",
    // extraction (src/utils/extractBlock.ts → setProp)
    logseq.settings?.prop_name || "pdf-ref",
  ];

  // Idempotent: only create schemas for properties that don't already exist.
  // Re-upserting an existing typed property can be rejected by the DB worker
  // (400). Does not change the default-type success path. Mirrors the proven
  // zoterolocal pattern (getAllProperties → filter existing → create the rest).
  let existingIdents: Set<string> = new Set();
  try {
    const allProps = await logseq.Editor.getAllProperties();
    existingIdents = new Set((allProps ?? []).map((p: any) => p?.ident).filter(Boolean));
  } catch (e) {
    console.warn("[PDF Extract] getAllProperties failed; creating all schemas", e);
  }

  let created = 0;
  for (const f of fields) {
    if (existingIdents.has(`:plugin.property.logseq-pdf-extract/${f}`)) {
      continue; // already bootstrapped, leave untouched
    }
    try {
      await logseq.Editor.upsertProperty(f, schemaFor(f), { name: f });
      created++;
    } catch (e) {
      console.error(`[PDF Extract] failed to create schema for "${f}"`, e);
    }
  }
  if (created > 0) {
    logseq.UI.showMsg(`PDF Extract: DB schema bootstrapped (${created} property${created === 1 ? "" : "s"})`, "info");
  }
  }

async function registerShortcuts() {
  logseq.App.registerCommandPalette({
    key: `extract_annotations_in_selected_blocks`,
    label: "PDF: Extract selected annotations into their blocks",
    keybinding: {
      binding: logseq.settings.key_convert,
      mode: "global",
    }
  },
    extractEditor
  );
  logseq.App.registerCommandShortcut(
    {
      binding: logseq.settings.key_search,
      mode: "global",
    },
    showSearchPanel
  );
  logseq.App.registerCommand("PDF Extract", {
    key: `import_selected`,
    label: "PDF: import selected Zotero items to cursor",
    keybinding: {
      binding: logseq.settings.key_import,
      mode: "global",
    }
  },
    () => importSelectedToCursor()
  )
  logseq.App.registerCommand("PDF Extract", {
    key: `add_pdf_extract_schema`,
    label: "PDF: Add PDF Extract schema to this graph",
  },
    () => addPdfExtractSchema()
  )
}


async function registerSlashCommand() {
  logseq.Editor.registerSlashCommand(
    "PDF: insert button from copied PDF",
    buttonFromClipboard
  );
  logseq.Editor.registerSlashCommand(
    "PDF: import selected Zotero items to cursor",
    () => importSelectedToCursor()
  );
  logseq.Editor.registerSlashCommand(
    "PDF: show search panel",
    showSearchPanel
  );
}

async function registerMacro() {
  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    try {
      let [type, path] = payload.arguments
      if (type !== ':pdf') return
      if (!path) path = ""

      // await logseq.Editor.updateBlock(payload.uuid, "")
      // let logscores: string = await parseScores(count_total_scores)
      // await logseq.Editor.updateBlock(payload.uuid, logscores)
      let zotero = logseq.settings?.zotero;

    } catch (error) { console.log(error) }
  })
}

export async function registerCommands() {
  await registerShortcuts();
  await registerSlashCommand();
  await registerMacro();
}