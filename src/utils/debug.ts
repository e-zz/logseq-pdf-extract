export function debug_welcome() {
  globalThis.debug_zotero = logseq.settings?.debug_zotero;
  globalThis.debug_hl = logseq.settings?.debug_hl;
  if (debug_zotero || debug_hl) {
    console.log(" 🤖: Here is Logseq PDF Extract!");
  }
}