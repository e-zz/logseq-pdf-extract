<template>
  <div class="container-wrap" v-bind:class="{ lspdark: opts.isDark }" @click="_onClickOutside">
    <div class="container-inner shadow-lg" v-if="ready" :style="{ left: left + 'px', top: top + 'px' }">
      <!-- <div class="_opener" v-if="currentPage" @click="_onClickOpenCurrentPage">
        Edit current page
      </div>
      <div class="_opener" @click="_onClickOpenConfig">Edit config.edn</div>
      <div class="_opener" @click="_onClickOpenCSS">Edit custom.css</div>
      <div class="_opener" @click="_onClickOpenCurrentGraph">
      Open graph folder 
    </div> -->
    </div>
  </div>
</template>

<script>
const __debug = false;


import { buttonFromClipboard } from "./utils/pdfOpenButton"

async function getContent(ref_id) {
  let ref_block = await logseq.Editor.getBlock(ref_id);
  ref_block = ref_block.content;
  // console.log("in getContent", content);


  if (__debug) {
    console.log("in getContent", ref_block, ref_block[0]);
    console.log("in getContent", ref_block[0][0].split('\n'));
  }

  // FIX use regex to get rid of `prop::`
  let ref_block_cleaned = ref_block.split('\n');

  if (__debug) {
    console.log("in getContent", ref_block_cleaned);
    console.log(ref_block_cleaned[0]);
  }

  if (ref_block_cleaned.length > 0) {
    return ref_block_cleaned[0];
  }
  return "";
}

import { getAreaBlockAssetUrl } from "./utils/assets"
import { ocrFromLocalPath } from "./utils/areaHL"

async function extractRef(uuid) {
  const prop = logseq.settings.val_prop;
  let ref_block = await logseq.Editor.getBlock(uuid);
  let ref_content = await getContent(uuid);

  // cases handling
  if (ref_content == "") {
    if (__debug) {
      console.log(`No valid content for ${uuid}`);
    }
    return `((${uuid}))`
  }


  if (ref_content.startsWith("[:span]")) {


    // TODO ocr the pic 
    let pic = getAreaBlockAssetUrl(await logseq.Editor.getBlockProperties(uuid), ref_block.page.id)
    ocrFromLocalPath(pic)
  }
  // if (__debug) {
  //   console.log("in openCurrentLine ref_content\t", ref_content);
  //   console.log("in openCurrentLine", `\n${prop}:: ((${uuid}))` + '\n> ' + ref_content + '\n');
  // }

  // TODO customize the text format (e.g. add a ">" prefix or something else around the text)
  // TODO use api instead: prop
  return `\n${prop}:: ((${uuid}))` + '\n> ' + ref_content + '\n\n'
}

const pattern_block_ref = /\(\(([\w-]*?)\)\)/g;
async function extractBlock(block) {
  // TODO Fix: edge cases of reconstruct a block containing ref(s)
  // 1. multiple refs in a block  
  // 2. ref wrapped by text 

  const block_content = block.content;
  if (__debug) {
    console.log("in openCurrentLine block\t", block);
    console.log("in openCurrentLine block_content\t", block_content);
  }

  const matches = [...block_content.matchAll(pattern_block_ref)];

  const replacements = await Promise.all(matches.map(async match => {
    return await extractRef(match[1]);
  }));

  // Replace each match in the original string
  let newContent = block_content;
  for (let i = 0; i < matches.length; i++) {
    newContent = newContent.replace(matches[i][0], replacements[i]);
  }

  if (__debug) { console.log("in ref ", newContent.trim()) }

  await logseq.Editor.updateBlock(block.uuid, newContent.trim());
}

async function extractEditor() {
  const blocks = await logseq.Editor.getSelectedBlocks();
  if (blocks?.length > 0) {
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index];
      await extractBlock(block);
    }
    return;
  }

  const block = await logseq.Editor.getCurrentBlock();
  await extractBlock(block);
}

async function registerShortcuts() {
  logseq.App.registerCommandPalette({
    key: `Open_current_line_in_default_editor`,
    label: "Open current line in default editor",
    keybinding: {
      binding: logseq.settings.key_convert,
      mode: "global",
    }
  },
    extractEditor
  );
}


async function registerSlashCommand() {
  logseq.Editor.registerSlashCommand(
    "PDF: insert button from copied PDF",
    buttonFromClipboard
  );
}

async function registerMacro() {
  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    try {
      let [type, path] = payload.arguments
      if (type !== ':pdf') return
      if (!path) path = ""

      await logseq.Editor.updateBlock(payload.uuid, "[:i \"Working..📈..📈.\"]")
      // let logscores: string = await parseScores(count_total_scores)
      // await logseq.Editor.updateBlock(payload.uuid, logscores)
      let zotero = logseq.settings?.zotero;
      console.log("in zotero", zotero);

    } catch (error) { console.log(error) }
  })
}

export default {
  name: "App",

  data() {
    return {
      ready: false,
      left: 0,
      top: 0,
      currentPage: false,
      opts: {
        isDark: false,
      },
    };
  },

  mounted() {
    logseq.App.getUserConfigs().then(
      (c) => (this.opts.isDark = c.preferredThemeMode === "dark")
    );

    logseq.App.onThemeModeChanged(({ mode }) => {
      this.opts.isDark = mode === "dark";
    });

    logseq.once("ui:visible:changed", ({ visible }) => {
      visible && (this.ready = true);
    });

    // const checkCurrentPage = async () => {
    // const currentPage = await logseq.Editor.getCurrentPage();

    // if (currentPage && currentPage.file) {
    //   this.currentPage = true;
    // } else {
    //   // const ansestor = await getAncestorPageOfCurrentBlock();
    //   // if (ansestor) {
    //   //   this.currentPage = true;
    //   // } else {
    //   //   this.currentPage = false;
    //   // }
    // }
    // };

    // logseq.on("ui:visible:changed", ({ visible }) => {
    //   if (visible) {
    //     const el = top.document.querySelector(`a#pdf-extract-anchor`);
    //     const rect = el.getBoundingClientRect();
    //     this.left = rect.left - 50;
    //     this.top = rect.top + 30;
    //     checkCurrentPage();
    //   }
    // });

    // logseq.App.onRouteChanged(({ path }) => {
    //   checkCurrentPage();
    // });

    // checkCurrentPage();

    registerShortcuts();
    registerMacro();
    registerSlashCommand();
  },

  methods: {
    _onClickOutside({ target }) {
      const inner = target.closest(".container-inner");

      !inner && logseq.hideMainUI();
    },
    // _onClickOpenCurrentPage() {
    //   openPageInVSCode();
    // },
    // _onClickOpenCurrentGraph() {
    //   openGraph();
    // },
    // _onClickOpenConfig() {
    //   openConfig("config.edn");
    // },
    // _onClickOpenCSS() {
    //   openConfig("custom.css");
    // },
  },
};
</script>
