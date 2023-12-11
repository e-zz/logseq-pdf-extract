import '@logseq/libs'
import { createApp } from 'vue'
import { injectAreaHL, changePropsLoad } from './utils/loadObservers'
import App from './App.vue'
import './index.css'

/**
 * user model
 */
function createModel() {
  return {
    openPDFExtract() {
      logseq.showMainUI()
    },
  }
}

/**
 * app entry
 */
function main() {
  logseq.setMainUIInlineStyle({
    position: 'fixed',
    zIndex: 11,
  })

  const key = logseq.baseInfo.id
  console.log(key);

  logseq.provideStyle(`
  div[data-injected-ui=pdf-extract-${key}] {
    display: flex;
    align-items: center;
    font-weight: 500;
    position: relative;
    top: 0px;
    opacity: 0.7;
  }

  div[data-injected-ui=logseq-pdf-extract--${key}]:hover a {
    opacity: 1;
  }
  
  div[data-injected-ui=logseq-pdf-extract--${key}] a.button {
    padding: 2px 6px 0 6px;
  }

  div[data-injected-ui=logseq-pdf-extract--${key}] iconfont {
    font-size: 18px;
  }
  `)

  // external btns
  logseq.App.registerUIItem('toolbar', {
    key: 'logseq-pdf-extract',
    template: `
      <a id="pdf-extract-anchor" class="button" data-on-click="openPDFExtract" style="padding-bottom: 0px;">
<svg fill="none" stroke="black" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="20"  >
  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z"></path>
</svg>
      </a>
    `,
  })

  // main UI
  createApp(App).mount('#app')
  

  changePropsLoad();
  
  injectAreaHL();
}

// bootstrap
logseq
  .useSettingsSchema([
  // {
  //   key: 'distro',
  //   type: 'enum',
  //   title: 'URL Scheme',
  //   description: 'Open the files in either VS Code Stable, Insiders or VS Codium',
  //   default: 'stable',
  //   enumChoices: ['stable', 'insiders', 'vs codium'],
  //   enumPicker: 'select'
  // }, {
  //   key: 'window',
  //   type: 'enum',
  //   title: 'VS Code Window',
  //   description: 'Where do you want to open the page?',
  //   default: 'stable',
  //   enumChoices: ['Always in a new window', 'Reuse the last active window', 'In the graph folder', 'In the graph folder (as workspace)'],
  //   enumPicker: 'select'
  // },
  // {
  //   key: 'key_convert',
  //   type: 'string',
  //   title: 'Shortcut: open current line',
  //   description: 'Shortcut to Extract the current line (default `ctrl+alt+o`)',
  //   default: 'mod+alt+o',
  // },
  // {
  //   key: 'key_open_page',
  //   type: 'string',
  //   title: 'Shortcut: open current page',
  //   description: 'Shortcut to Extract the current page (default `ctrl+o`)',
  //   default: 'mod+o',
  // },
  //  {
  //   key: 'key_open_graph',
  //   type: 'string',
  //   title: 'Shortcut: open current graph',
  //   description: 'Shortcut to Extract the current graph (default `ctrl+shift+o`)',
  //   default: 'mod+shift+o',
  // },
  { key: 'key_convert',
    type: 'string',
    title: 'Shortcut: invoke conversion of PDF refs in the focused block (or in selected blocks)',
    description: 'Shortcut to extract text from PDF ref (default `ctrl+alt+i`)',
    default: 'mod+alt+i',
  },
  { key: 'val_prop',
    type: 'string',
    title: 'Name of the property to store PDF refs',
    description: 'Name of the property to store PDF refs (default `pdf-ref`)',
    default: 'pdf-ref',
  },
  {
    key: "PDF Root",
    type: "string",
    inputAs: "textarea",
    default: "",
    title: "PDF Root Folders for `open` Button",
    description:
        "Fill in the root folders of your PDF files, separated by comma. For example: /home/user/Documents, C:/Users/Downloads",
},
  {
    key: "HuggingFace User Access Token",
    type: "string",
    default: "",
    title: "HuggingFace User Access Token",
    description:
        " Paste your HuggingFace User Access Token. For more information https://huggingface.co/docs/hub/security-tokens",
},
//   {
//     key: "Mathpix Key",
//     type: "string",
//     default: "",
//     title: "Mathpix API Key",
//     description:
//         "Paste your Mathpix API Key. For more information https://docs.mathpix.com/#authentication",
// },
//   {
//     key: "Mathpix ID",
//     type: "string",
//     default: "",
//     title: "Mathpix ID",
//     description:
//         "",
// },
  ]).ready(createModel()).then(main)
