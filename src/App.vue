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
const __debug = true;


import { buttonFromClipboard } from "./utils/pdfOpenButton"
import { readOcr, updateOcr } from "./utils/ocrLib"
import { importSelectedToCursor, test_zimport } from './utils/zotero'
import { wrapAreaIdTex } from "./utils/texLib";

async function getContent(ref_id) {
  let ref_block = (await logseq.Editor.getBlock(ref_id)).content;
  // console.log("in getContent", content);


  if (__debug) {
    console.log("in getContent 1", ref_block, ref_block[0]);
    console.log("in getContent 2", ref_block[0][0].split('\n'));
  }

  // FIX use regex to get rid of `prop::`
  // following lines assume prop:: only appears at the end of the block 
  let ref_block_cleaned = ref_block.split('\n');

  if (__debug) {
    console.log("in getContent 3", ref_block_cleaned);
    console.log(ref_block_cleaned[0]);
  }

  if (ref_block_cleaned.length > 0) {
    return ref_block_cleaned[0];
  }
  return "";
}


function formatStyle(excerpt) {
  const style = logseq.settings.excerpt_style;
  return style.replace("{{excerpt}}", excerpt);
}

async function extractRef(uuid) {
  // convert a uuid of annotation to wanted format 
  let ref_content = await getContent(uuid);
  let ref = `((${uuid}))`;

  // cases handling
  if (ref_content == "") {
    if (__debug) {
      console.log(`No valid content for ${uuid}`);
    }
    return ref
  }

  let prop_uuid = "";
  const prop = logseq.settings.prop_name;
  if (prop != "") {
    prop_uuid = `\n${prop}:: ${ref}\n`
  }

  const hl_type = await logseq.Editor.getBlockProperty(uuid, "ls-type")

  if (__debug) {
    console.log("extract uuid", uuid);
    console.log("in extractRef", hl_type);
  }

  if (hl_type == "annotation") {
    return prop_uuid + formatStyle(ref_content)
  }

  let prop_ocr = await readOcr(uuid);
  // if (hl_type == "area") {
  // if (ref_content.startsWith("[:span]")) {
  if (prop_ocr == "") {
    prop_ocr = await updateOcr(uuid);
  }
  return wrapAreaIdTex(prop_ocr, uuid)
  // }
}

const pattern_block_ref = /\(\(([\w-]*?)\)\)/g;
async function extractBlock(block) {
  // TODO Fix: edge cases of reconstruction of a block containing ref(s)
  // 1. multiple refs in a block  
  // 2. DONE ref surrounded by text 

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
    key: `extract_annotations_in_selected_blocks`,
    label: "Extract annotations in selected blocks",
    keybinding: {
      binding: logseq.settings.key_convert,
      mode: "global",
    }
  },
    extractEditor
  );
  logseq.App.registerCommandShortcut(
    {
      binding: logseq.settings.key_import,
      mode: "editing",
    },
    () => importSelectedToCursor()
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
