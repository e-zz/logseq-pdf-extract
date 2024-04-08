import '@logseq/libs'
import { createApp } from 'vue'
import { injectAreaHL, changePropsLoad } from './utils/loadObservers'
import { registerCommands } from './registerCommands'
import App from './App.vue'
import { DynamicScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import './index.css'
import { debug_welcome } from './utils/debug'

/**
 * user model
 */
function createModel() {
  return {}
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
  //   logseq.App.registerUIItem('toolbar', {
  //     key: 'logseq-pdf-extract',
  //     template: `
  //       <a id="pdf-extract-anchor" class="button" data-on-click="openPDFExtract" style="padding-bottom: 0px;">
  // <svg fill="none" stroke="black" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="20"  >
  //   <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z"></path>
  // </svg>
  //       </a>
  //     `,
  //   })

  // main UI
  const app = createApp(App)
  app.component('DynamicScroller', DynamicScroller)
  app.mount('#app')


  changePropsLoad();

  injectAreaHL();

  registerCommands();

  debug_welcome();

}

// bootstrap
logseq
  .useSettingsSchema([
    {
      key: 'group Zotero',
      title: "📚 Access Zotero",
      description: "",
      type: "heading",
      default: null,
    },
    {
      key: 'key_import',
      type: 'string',
      title: 'Shortcut: import items selected in Zotero',
      description: 'Import selected Zotero items (default `ctrl+alt+e`). Restart or refresh Logseq to take effect.',
      default: 'mod+alt+e',
    },
    {
      key: 'key_search',
      type: 'string',
      title: 'Shortcut: show zotero search panel',
      description: 'Invoke the Zotero search panel (default `ctrl+alt+z`). Restart or refresh Logseq to take effect.',
      default: 'mod+alt+z',
    },
    {
      key: 'search_delay',
      type: 'string',
      title: 'Delay (ms) between typing and responsive search',
      description: 'Set the delay between typing and responsive search (default `100`). Restart or refresh Logseq to take effect.',
      default: '100',
    },
    {
      key: 'insert_button',
      type: 'boolean',
      default: true,
      title: 'Option: Insert PDF open button(s) when importing selected items in Zotero',
      description: 'Choose whether to insert a button for selected Zotero items (Default: on).',
    },
    {
      key: 'alias_citationKey',
      type: 'boolean',
      default: false,
      title: 'Option (Experimental): use BetterBibTeX citationKey as page alias',
      description: 'If you use [BetterBibTeX](https://github.com/retorquere/zotero-better-bibtex), you can choose `citationKey` as page alias. Search importation is also affected: `[[citationKey]]` will be used when importing items at cursor. (Recommend: off)',
    },
    {
      key: 'unwanted_keys',
      type: 'string',
      inputAs: "textarea",
      default: '',
      title: 'List of property keys to exclude',
      description: 'Put the property keys you want to ignore when importing Zotero items, separated by comma or line break. For example: `prop_key1, prop_key2`',
    },
    {
      key: 'group extract',
      title: "🧷 Convert PDF ref into text",
      description: "",
      type: "heading",
      default: null,
    },
    {
      key: 'key_convert',
      type: 'string',
      title: 'Shortcut: extract annotations in the focused block(s)',
      description: 'Extract text (or OCR TeX) from PDF annotations (default `ctrl+alt+i`). Restart or refresh Logseq to take effect.',
      default: 'mod+alt+i',
    },
    {
      key: 'prop_name',
      type: 'string',
      title: 'Name of the property to store PDF refs',
      description: 'Name of the property to store PDF refs (default `pdf-ref`). If empty, link to PDF annotation will be removed.',
      default: 'pdf-ref',
    },
    {
      key: 'excerpt_style',
      type: 'string',
      inputAs: "textarea",
      default: "> {{excerpt}}\n\n",
      title: 'Customize the style for your PDF excerpts',
      description: 'Use `{{excerpt}}` as placeholder of your excerpt.',
    },
    {
      key: 'area_style',
      type: 'string',
      inputAs: "textarea",
      default: "((uuid))\n$$tex$$",
      title: 'Customize style for area OCR results',
      description: 'Use `tex` as placeholder for OCR results. For example, `$tex$` for inline math. And remove the `((uuid))` placeholder to replace picture with OCR results.',
    },
    {
      key: "HuggingFace User Access Token",
      type: "string",
      default: "",
      title: "HuggingFace User Access Token",
      description:
        " Paste your HuggingFace User Access Token. For more information https://huggingface.co/docs/hub/security-tokens",
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
      key: 'group dev',
      title: "🤖 Dev",
      description: "More verbose logs in console for the dev purpose.",
      type: "heading",
      default: null,
    },
    // TODO: use enum type
    //  {
    //     key: "debug",
    //     type: "enum",
    //     default: [],
    //     title: "",
    //     enumChoices: [
    //         "A",
    //         "B",
    //         ...
    //     ],
    //     enumPicker: "checkbox",
    //     description: "",
    // },
    {
      key: 'debug_zotero',
      type: 'boolean',
      default: false,
      title: 'Zotero',
      description: '',
    },
    {
      key: 'debug_hl',
      type: 'boolean',
      default: false,
      title: 'Highlight',
      description: '',
    },
  ]).ready(createModel()).then(main)
