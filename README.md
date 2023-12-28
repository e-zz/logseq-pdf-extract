# PDF Extract
## 1. A Quick Guide


### 1.1 Extract Zotero Items  (Experimental)

> ❗ **Requirement:** To use it, you need to install [ZotServer](https://github.com/e-zz/ZotServer/releases) plugin in Zotero. No extra configuration is needed. After installation, open `http://localhost:23119/` in your browser. If you see `No endpoint found`, then it's working. Also, keep Zotero open while importing.

This function mimics Logseq's `/Zotero` command, but it's fully local. Till now, it supports importing items selected in Zotero and search in Zotero through a pop-up panel. More features are planned.

- Shortcut `Ctrl+Alt+e` to import items selected in Zotero
  - [ ] Import selected PDF items or attachments in Zotero
- Search Panel (`Ctrl+Alt+z` or slash command `/PDF: show search panel`)
  - [x] Search in Zotero and import items as Logseq pages
  - [x] Import items selected in Zotero as Logseq pages
  - [ ] ❓ support Zotero search syntax
  - [ ] UI: allow users to select attachments
- [ ] UI: show recent items in Zotero
- [ ] ❓ show recent PDF files opened in Logseq. (Not sure if it's possible.)

#### Import items already selected in Zotero 
To import selected items from Zotero as Logseq pages, use the `Ctrl+Alt+e` shortcut. This can be particularly useful if you wish to open a file that has just been added to Zotero via the Zotero Connector, or if you need to import several items simultaneously.

![demonstration](importSelected.gif)

- Option: turn off the automatic insertion of PDF open buttons while importing. See [Settings](#settings) for more details.
- Slash command: `/PDF Extract: import items selected in Zotero`
- It's also possible to import through the search box: see [Search Panel](#search-panel) 


#### Search Panel 
Use `Ctrl+Alt+z` or slash command `/PDF: show search panel`.  This is designed to be a complete replacement of Logseq's `/Zotero` command. The backend is powered directly by Zotero so [ZotServer](https://github.com/e-zz/ZotServer/releases) is necessary.

![search](searchPanel.gif)

- On showing up, it will list those items selected in Zotero. (This only works after the first run. See [Known Issues](#known-issues))
- Type keywords and press `Enter` to search. 
- Use up/down arrow keys to navigate the list and `Enter` to import. Or directly click on the item.
- The item will be imported as a page if no duplicate page is found in Logseq. 

This hasn't been thoroughly tested. Please use `ctrl+z` to undo if something goes wrong.

To be implemented
- [ ] ❓ support Zotero search syntax

#### Notes
Not currently planned. But PRs are welcome.

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
With [Zotero integration](https://docs.logseq.com/#/page/zotero) enalbed, we could open PDFs under `Zotero linked attachment base directory` even if it's not in the assets folder. Logesq provides a macro `{{zotero-linked-file your_pdf_path}}` which is rendered as a button.
<br>
<img src="pdfOpenButton.png" width="250" >
<br>

Here is how we could take advantage of it:
- (One-time setting) If you're using this plugin for the first time, you'll need to set the `PDF Root` in the plugin settings. This should be the path to your `Zotero linked attachment base directory`. To do this, navigate to the plugin settings, find the `PDF Root` field, and paste your path into this field.
- Copy the path to any PDF under the path `Zotero linked attachment base directory`
- In Logseq, use the slash command `/PDF: insert button from copied PDF`

> **Caution!** Buttons are delicate. If Logseq cannot find a PDF specified by the button, it may crash (possible data loss). Dynamical update might be implemented in the future. But no easy solutions so far. One idea is to record Zotero item key to update the button from Zotero. PRs or ideas are welcome.

> **How it works and when to use it.**
Personally, I love this hack because in principle by creating mutli-profiles, we could open any PDFs no matter where it's located on your PC. For example, we could insert buttons as "bookmarks" linked to any PDF without importing them. But this feature relies on [this PR](https://github.com/logseq/logseq/pull/10430). Till now, this function can only be used as an alternative to copy a button that already exists in Zotero item page `@xxx` by hands.
>
> And maybe with more Logseq API published in future, we could create various buttons, such as a button that links to a specific page of a PDF. This would be useful for note-taking or tracking the reading progress.

## 2. Settings
#### `insert_button`: insert PDF open button when importing Zotero items
If enabled, when importing Zotero items, the plugin will insert a PDF open button if the item has a PDF attachment. Notice that it will insert multiple buttons if more than one PDF attachment is found.

If you don't want this behavior, tick it off. 
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

# Known Issues

- [ ] The first time you use the search box, it will not show what has been selected in Zotero. A workaround is to open the search box twice.

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
- Mcrosoft Bing: [Designer](https://www.bing.com/images/create/)

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
