<template>
  <div class="container-wrap" v-bind:class="{ lspdark: opts.isDark }" @click="_onClickOutside">
    <div class="container-inner shadow-lg" v-if="ready" :style="{ left: left + 'px', top: top + 'px' }">
      <div class="_opener" v-if="currentPage" @click="_onClickOpenCurrentPage">
        Edit current page
      </div>
      <div class="_opener" @click="_onClickOpenConfig">Edit config.edn</div>
      <div class="_opener" @click="_onClickOpenCSS">Edit custom.css</div>
      <div class="_opener" @click="_onClickOpenCurrentGraph">
        Open graph folder
      </div>
    </div>
  </div>
</template>

<script>
const __debug = false;

function generateUrl(path, line = 0, row = 999, new_window = true) {
  const { distro } = logseq.settings;
  const protocol = distro === "stable" ? "vscode" : distro === "insiders" ? "vscode-insiders" : "vscodium";

  const lineRow = line ? `:${line}:${row}` : "";

  const windowId = new_window ? "?windowId=_blank" : "";

  return `${protocol}://file/` + path + lineRow + windowId;
}

async function openConfig(name) {
  const graph = await logseq.App.getCurrentGraph();
  window.open(
    generateUrl(graph.url.replace("logseq_local_", "") + "/logseq/" + name)
  );
}

function ifOpenNewWindow() {
  return (logseq.settings.window.includes("new"));
}

async function getGraph() {
  const graph = await logseq.App.getCurrentGraph();
  return graph.url.replace("logseq_local_", "");
}

async function getGraphWorkspace() {
  const graph = await logseq.App.getCurrentGraph();
  return graph.url.replace("logseq_local_", "") + `/${graph.name}.code-workspace`;
}

async function openGraphFolder() {
  window.open(generateUrl(await getGraph(), 0, 0, true));
}

async function openGraphAsWorkspace() {
  window.open(generateUrl(await getGraphWorkspace(), 0, 0, true));
}

async function openGraph() {
  if (logseq.settings.window.includes("workspace")) {
    return await openGraphAsWorkspace();
  }
  await openGraphFolder();
}

async function getAncestorPageOfCurrentBlock() {
  const block = await logseq.Editor.getCurrentBlock();
  return block?.page;
}

async function findFile(fileId) {
  const graph = await logseq.App.getCurrentGraph();

  const matches = await logseq.DB.datascriptQuery(
    `[:find ?file
                :where
                [?b :file/path ?file]
                [(== ?b ${fileId})]
            ]`
  );

  if (matches && matches.length > 0) {
    const file = graph.url.replace("logseq_local_", "") + "/" + matches[0][0];
    return file;
  } else {
    return null;
  }
}

async function openPageLineInVSCode(line_number, row_number = 999) {
  const ansetor = await getAncestorPageOfCurrentBlock();

  if (ansetor) {
    const page = await logseq.Editor.getPage(ansetor.id);

    if (page && page.file) {
      const fileId = page.file.id;
      const file = await findFile(fileId);

      if (file) {
        window.open(generateUrl(file, line_number, row_number, ifOpenNewWindow()));
        return;
      }
    }
  }
}

function sortBlocks(children) {
  let id_chains = children.map(child => child.left);

  children.sort((a, b) => {
    let indexA = id_chains.indexOf(a.left);
    let indexB = id_chains.indexOf(b.left);
    if (indexA < indexB) {
      return -1;
    } else if (indexA > indexB) {
      return 1;
    } else {
      return 0;
    }
  });
}

// To count the line number of a block in correct order, we need to reorder the children of the block
function scanBlock(block, line, reorder = false) {
  let count = block.content.split('\n').length;
  let found_line = block.id === line.id;

  if (found_line) {
    return { lineCount: count, hasLine: found_line };
  }

  if (block.children.length === 0) {
    if (__debug) {
      console.log(block);
    }
    return { lineCount: count, hasLine: found_line };
  }


  if (block.children.length > 0) {
    // iterate over children blocks 
    if (reorder) {
      sortBlocks(block.children);
    }

    for (let index = 0; index < block.children.length; index++) {
      const child = block.children[index];
      // count the line number of each child block
      if (found_line) {
        break;
      }
      let search_subblock = scanBlock(child, line);
      if (__debug) {
        console.log(child.content, "old count", count, "inc", search_subblock.lineCount, search_subblock.hasLine);
      }
      count += search_subblock.lineCount;
      found_line = search_subblock.hasLine;
    }
    if (__debug) {
      console.log(block.content, count, found_line);
    }
    return { lineCount: count, hasLine: found_line };
  }
}

async function countLineNumebr() {
  let count = 0;
  let curb = await logseq.Editor.getCurrentBlock();
  if (__debug) {
    console.log("current block", curb);
  }

  // It seems possible to get a page by name but not id. Strange
  const page = await logseq.Editor.getPage(curb?.page.id);
  let all_blocks = await logseq.Editor.getPageBlocksTree(page.name);

  if (__debug) {
    console.log(all_blocks);
  }

  for (let index = 0; index < all_blocks.length; index++) {
    if (index === 0) {
      // if the first block is a property block, trim it and count lines
      let first_block = all_blocks[0].content.trim().split('\n');
      if (first_block[0].includes("::")) {
        count += first_block.length + 1;
        continue;
      }
    }
    const block = all_blocks[index];
    let subcount = scanBlock(block, curb, true);
    count += subcount.lineCount
    if (__debug) {
      console.log("level 0", index, count);
    }
    if (subcount.hasLine) {
      break;
    }
  }
  return count;
}

async function extractExcerptBlock(block) {

  console.log(block, block.refs, block.refs[0]);


  let ref = block.refs[0];
  console.log(ref, ref.id);

  let ref_block = await logseq.DB.datascriptQuery(
    `[:find ?blck
                :where
                [?b :block/content ?blck]
                [(== ?b ${ref.id})]
            ]`
  );
  console.log("in extractExcerptBlock", ref_block, ref_block[0]);
  console.log("in extractExcerptBlock", ref_block[0][0].split('\n'));

  let ref_block_cleaned = ref_block[0][0].split('\n');

  console.log(ref_block_cleaned[0]);
  if (ref_block_cleaned.length > 0) {
    return ref_block_cleaned[0];
  }
  return "";
}

async function openCurrentLine() {
  const block = await logseq.Editor.getCurrentBlock();
  const block_content = block.content;
  console.log("in openCurrentLine", block_content);

  let ref_content = await extractExcerptBlock(block);
  console.log("in openCurrentLine", `Extracted_from:: ${block_content}` + '\n' + ref_content);

  // await logseq.Editor.insertAtEditingCursor(ref_content + 'this is a test');
  await logseq.Editor.updateBlock(block.uuid, `PDF-Ref:: ${block_content}` + '\n' + ref_content);
  // if (logseq.settings.window.includes("graph")) {
  //   await openGraph();
  // }
  // await openPageLineInVSCode(await countLineNumebr());
}

async function openPageInVSCode() {
  if (logseq.settings.window.includes("graph")) {
    await openGraph();
  }
  await openPageLineInVSCode(0);
}

async function registerShortcuts() {
  logseq.App.registerCommandPalette({
    key: `Open_current_line_in_default_editor`,
    label: "Open current line in default editor",
    keybinding: {
      binding: logseq.settings.key_open_line,
      mode: "global",
    }
  },
    openCurrentLine
  );
  logseq.App.registerCommandPalette({
    key: `Open_current_page_in_default_editor`,
    label: "Open current page in default editor",
    keybinding: {
      binding: logseq.settings.key_open_page,
      mode: "global",
    }
  },
    openPageInVSCode
  );

  logseq.App.registerCommandPalette({
    key: `Open_graph_folder_in_default_editor`,
    label: "Open graph folder in default editor",
    keybinding: {
      binding: logseq.settings.key_open_graph,
      mode: "global",
    }
  },
    openGraph
  );
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

    const checkCurrentPage = async () => {
      const currentPage = await logseq.Editor.getCurrentPage();

      if (currentPage && currentPage.file) {
        this.currentPage = true;
      } else {
        const ansestor = await getAncestorPageOfCurrentBlock();
        if (ansestor) {
          this.currentPage = true;
        } else {
          this.currentPage = false;
        }
      }
    };

    logseq.on("ui:visible:changed", ({ visible }) => {
      if (visible) {
        const el = top.document.querySelector(`a#pdf-extract-anchor`);
        const rect = el.getBoundingClientRect();
        this.left = rect.left - 50;
        this.top = rect.top + 30;
        checkCurrentPage();
      }
    });

    logseq.App.onRouteChanged(({ path }) => {
      checkCurrentPage();
    });

    checkCurrentPage();

    registerShortcuts();
  },

  methods: {
    _onClickOutside({ target }) {
      const inner = target.closest(".container-inner");

      !inner && logseq.hideMainUI();
    },
    _onClickOpenCurrentPage() {
      openPageInVSCode();
    },
    _onClickOpenCurrentGraph() {
      openGraph();
    },
    _onClickOpenConfig() {
      openConfig("config.edn");
    },
    _onClickOpenCSS() {
      openConfig("custom.css");
    },
  },
};
</script>
