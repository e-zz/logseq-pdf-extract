import { buttonFromClipboard } from "./utils/pdfOpenButton"
import { importSelectedToCursor } from './zotero/zotero'

import { extractEditor } from "./utils/extractBlock";

const __debug = false;


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
  // logseq.App.registerCommandShortcut(
  //   {
  //     binding: logseq.settings.key_import,
  //     mode: "editing",
  //   },
  //   () => importSelectedToCursor()
  // );
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
}
async function showSearchBox() {
  logseq.showMainUI();
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
    "PDF: show search box",
    showSearchBox
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