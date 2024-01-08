<h1><img src="icon.png" alt="Alt text" width="40" height="40"> Logseq PDF Extract </h1>

## 🛠 Installation
Search for "PDF Extract" in the Logseq plugin store and install it. Or you could install it manually by downloading the latest release from [GitHub Releases](https://github.com/e-zz/logseq-pdf-extract/releases/latest).

> ❗ **To enable Zotero-related features** 
> - It's also necessary to install [ZotServer](https://github.com/e-zz/ZotServer/releases/latest) plugin in Zotero. Check [Zotero Documentation](https://www.zotero.org/support/plugins) to learn how to install Zotero plugins.
> - If ZotServer is successfully installed, open `http://localhost:23119/` in browser and you should see `No endpoint found`. 
> - Zotero must be open while using this feature.

## 🚀 A Quick Guide

### 1.1 Import Zotero Items  (Experimental)

This function serves as a local equivalent to Logseq's . For a comparison between this and Logseq's native `/Zotero` command, see [#6](https://github.com/e-zz/logseq-pdf-extract/discussions/6).

Currently, this plugin supports quick importing of items selected in Zotero or in a Zotero search panel. More features are planned (see [here](#possible-improvements) PRs are welcome). Also, Better BibTeX citation key can be imported. (Experimental. See [#alias_citationKey](#alias_citationkey-experimental) ).

- Import items selected in Zotero: 
  - Press `Ctrl+Alt+e` or type `/PDF: import selected Zotero items at cursor` 
  - Selected Zotero Items => Logseq pages
  - Use case: 
    - import items that have just been added to Zotero from browser via the Zotero Connector
    - import multiple items simultaneously
  - Option: turn off automatic insertion of PDF open buttons while importing. See [Settings](#settings) for more details.

![demonstration](importSelected.gif)

- Show search panel: 
  - Press `Ctrl+Alt+z` or type `/PDF: show search panel`
  - Search items by titles (press `Enter` to execute a search).
  - Use mouse or arrow keys to scroll the results.
  - Press `Enter` or click to insert an item at cursor.
      - `ctrl+click` to insert multiple items
  - The items inserted will also be imported into Logseq if no duplicate page found (just like `/Zotero`).
  - And on showing up, by default it will list items selected in Zotero.  (But this does not work at the first run after Logseq is opened or refreshed. See [Known Issues](#known-issues))

![search](searchPanel.gif)

> ❗ Search panel hasn't been thoroughly tested. Please use `ctrl+z` to undo if something goes wrong.

> About importing notes: 
> Not currently planned. But PRs are welcome.

### 1.2 Annotation Extraction
Use `Ctrl+Alt+i` to get the original text of the reference to annotation block.
#### Get Excerpts of PDF Text Highlights
Sometimes it's preferred to keep both the ref and the highlighted text. This plugin provides a shortcut to extract the excerpt of the text highlights while keeping the original references.  

A template is provided to customize the style of the inserted text. See [Template for Annotation Excerpts](#excerpt_style-template-for-annotation-excerpts) for more details.

<!-- TODO explain the pdf-ref property -->

#### TeX OCR of Area Highlights
Inspired by [logseq-formula-ocr-plugin](https://github.com/olmobaldoni/logseq-formula-ocr-plugin), this plugin helps to extract TeX from area highlights.

> ❗ **For new users: API token** The OCR service from Hugging Face is used.
> 1. Get a [Hugging Face API token](https://huggingface.co/settings/tokens)
> 2. In the plugin settings, paste your API key to the `HuggingFace User Access Token` field.
> 
> Notice that the free quota of the OCR service is not quite clear to me (please tell me if you know the number). For more info, see [Hugging Face - Documentation - huggingface.co/](https://huggingface.co/docs).

> Notice the plugin modifies `hl__xxx` pages. A block property `ocr::`  will be added to the area highlight block, as shown below. This is to avoid repeated OCR of the same area highlight. If you want to re-OCR an area highlight, just delete the `ocr::` property.
> <br>
> <img src="originalAreaHL.png" width="200" >


Two ways are provided to extract TeX from area highlights: button and shortcut.
##### Button: Copy TeX to clipboard
On the area highlights, a button named `copy as TeX` is provided to copy TeX to clipboard.  
<img src="areaHL.png" width="200" >


##### Shortcut: Insert TeX into the Block
Use `Ctrl+Alt+i` to insert TeX string into the block. A template is provided to customize the style of the inserted TeX. See [Template for TeX OCR](#area_style-template-for-inserting-tex) for more details.

### 1.3 PDF Open Button (Experimental)
With [Zotero integration](https://docs.logseq.com/#/page/zotero) enabled, we could open PDFs under `Zotero linked attachment base directory` even if it's not in the assets folder. Logesq provides a macro `{{zotero-linked-file your_pdf_path}}` which is rendered as a button.
<br>
<img src="pdfOpenButton.png" width="250" >
<br>

Here is how we could take advantage of it:
- (One-time setting) If you're using this plugin for the first time, you'll need to set the `PDF Root` in the plugin settings. This should be the path to your `Zotero linked attachment base directory`. To do this, navigate to the plugin settings, find the `PDF Root` field, and paste your path into this field.
- Copy the path to any PDF under the path `Zotero linked attachment base directory`
- In Logseq, use the slash command `/PDF: insert button from copied PDF`

> **Caution!** Buttons are delicate. If Logseq cannot find a PDF specified by the button, it may crash (possible data loss). Dynamical update might be implemented in the future. But no easy solutions so far. One idea is to record Zotero item key to update the button from Zotero. PRs or ideas are welcome.

> **How it works and when to use it.**
Personally, I love this hack because in principle by creating mutli-profiles, we could open any PDFs no matter where it's located on your PC. For example, we could insert buttons as "bookmarks" linked to any PDF without importing them. However, this feature depends on the enhancements to the multi-profile feature, as proposed in [this PR](https://github.com/logseq/logseq/pull/10430). Without it, it's better to ignore this function till now.
>
> Maybe with more Logseq API published in future, we could create various buttons, such as a button that links to a specific page of a PDF, or even "non-highlight" button that eliminates the need for highlighting. And if you have any ideas, PRs are welcome.

## ⚙ 2. Settings
#### `insert_button`: insert PDF open button when importing Zotero items
If enabled, when importing Zotero items, the plugin will insert a PDF open button if the item has a PDF attachment. Notice that it will insert multiple buttons if more than one PDF attachment is found.

If you don't want this behavior, tick it off. 

#### `alias_citationKey` (Experimental)
It's quite common to use [Better BibTeX](https://github.com/retorquere/zotero-better-bibtex/) to manage BibTeX keys in Zotero. 

If this option is on, the citation key will be used as the `alias` property of an item page.  (Inspired by [sawhney17/logseq-citation-manager](https://github.com/sawhney17/logseq-citation-manager))
> For example, if the citation key is `Smith2021`, then the item page will have property `alias:: [[Smith2021]]`. Also, the item will be inserted as `[[Smith2021]]` at cursor, instead of the full title.

#### `excerpt_style`: Template for Annotation Excerpts
This template defines the style of the inserted text. In the template, `{{excerpt}}` is provided as a placeholder, which will be replaced by the excerpt. The default template is
``` 
> {{excerpt}}
```

#### `area_style`: Template for Inserting TeX 
When inserting TeX, one could customize the style by a template. In the template, two placeholders are provided: `uuid` and `tex`, which will be replaced by the UUID of the area highlight and the TeX respectively. The default template is
```
((uuid))\n$$tex$$
```
> For example, if you need to replace the original area highlights with TeX, then use `$$tex$$` as the template. More complex template with hiccup syntax should be possible, but I haven't tested it.

# Possible Improvements

Import as Logseq pages:
- [ ] PDF items (PDF without a parent item)

Import at cursor:
- [ ] Import specific attachment as a button

Search Panel:
  - [ ] UI: allow users to select attachments
  - [ ] UI: show recent items in Zotero

Search Syntax:
  - [ ] ❓ support additional [Zotero search features](https://www.zotero.org/support/dev/client_coding/javascript_api)
    - [Zotero search fields](https://www.zotero.org/support/dev/client_coding/javascript_api/search_fields)
    - [Zotero search syntax](https://github.com/zotero/zotero/blob/b31f66ddbdc59cdf97966a392f510ed0afff706f/chrome/content/zotero/xpcom/data/searchConditions.js)

---
Proof of concept:
- [ ] ❓ Full-text search across PDFs and open matched pages in Logseq
- [ ] ❓ two-way sync: tags, title, etc.
- [ ] ❓ support Zotero search syntax
- [ ] ❓ show recent PDF files opened in Logseq. (Not sure if it's possible.)

--- Not planned yet
- [ ] Notes and two-way sync
- [ ] Item page customization: e.g., Org-mode support

# Known Issues

- [ ] The first time you use the search box, it will not show what has been selected in Zotero. A workaround is to open the search box twice.
- [ ] Occasionally the arrow keys don't work in the search box. A workaround is to use the mouse. It should be fixed after Logseq restarts or refreshes.

# Acknowledgements
TeX OCR
- olmobaldoni: [logseq-formula-ocr-plugin](https://github.com/olmobaldoni/logseq-formula-ocr-plugin)
- NormXU: [nougat-latex-ocr](https://github.com/NormXU/nougat-latex-ocr)
- Hugging Face: [Norm/nougat-latex-base](https://huggingface.co/Norm/nougat-latex-base)

Zotero API 
- Zotero: [Zotero API](https://www.zotero.org/support/dev/web_api/v3/start)
- MunGell: [ZotServer](https://github.com/MunGell/ZotServer)
- cboulanger: [excite-docker](https://github.com/cboulanger/excite-docker)

Icon
- Microsoft Bing: [Designer](https://www.bing.com/images/create/)

Search Panel GUI
- xyhp915: [logseq-assets-plus](https://github.com/xyhp915/logseq-assets-plus)

Coding Assistance
- GitHub Copilot


# Support
Find this plugin useful? [Buy me a coffee](https://www.buymeacoffee.com/e.zz) ☕️ or you could support my favorite Logseq plugins and their developers. It's also a great help for me. 
- [debanjandhar12/logseq-anki-sync](https://github.com/debanjandhar12/logseq-anki-sync): I love its idea of keeping links to Logseq blocks in Anki cards. It has significantly enhanced my experience of reviewing and updating cards on Anki mobile.
-  [haydenull/logseq-plugin-agenda](https://github.com/haydenull/logseq-plugin-agenda): a game changer for task management.

Both projects are not only feature-rich but also continue to evolve through active development.

# Development

- Install dependencies with `npm install`
- Build the application using `npm run build` or `npm run watch`
- Load the plugin in the Logseq Desktop client using the `Load unpacked plugin` option.

> ❗ **Notice:** Unfortunately, the dependency `vue-virtual-scroller` does not work well with `vite run --watch` or `npm run watch` in the `package.json`. Use `npm run build` instead. Please help if you know how to fix it.
