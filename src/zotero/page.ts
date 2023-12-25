const __debug = false;

import { Attachment } from "./attachment";

interface ZoteroPage {
  title: string;
  props: { [key: string]: string | string[] | number };
  attachments?: Attachment[];
  notes?: any[];
}

function camelToKebab(camelCase: string): string {
  return camelCase.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

const wrapTag = (tag: string) => `[[${tag}]]`;



const unwantedKeys = [
  'dateAdded',
  'dateModified',
  'collections',
  'key',
  'attachments',
  'relations',
  'version'
];

export class Page implements ZoteroPage {
  // TODO can this cover all the fields in ZoteroRawItem ?
  // key: string;
  // itemType: string;
  title: string;
  props: { [key: string]: string | string[] | number };
  attachments?: Attachment[];

  constructor() { }

  static fromRaw(rawData: any): Page {
    let props = {};
    let attachments = [];
    // TODO note 
    // let notes = {}; 

    for (const [key, value] of Object.entries(rawData)) {
      switch (key) {
        case 'title':
          props['title'] = `@${value}`;
          break;
        case 'ISBN':
          props['isbn'] = value;
          break;
        case 'itemType':
          props['item-type'] = wrapTag(value);
          break;
        case 'creators':
          // TODO check creatorType (usually 'author', but can be other values )
          props['authors'] = value.map(creator => wrapTag(creator.firstName + creator.lastName)).join(', ');
          break;
        case 'tags':
          props['tags'] = value.map(tag => wrapTag(tag)).join(', ');
          break;
        case 'attachments':
          attachments = value;
          break;
        default:
          // remove unwanted keys
          if (unwantedKeys.includes(key)) {
            break;
          }
          props[camelToKebab(key)] = value;
      }
    }

    // create properties that are not in the original item
    props['links'] = `[Local library](zotero://select/library/items/${rawData.key})`;

    let page = new Page();
    page.title = props['title'];
    page.props = props;
    page.attachments = attachments.map(attachment => Attachment.fromRaw(attachment));
    return page
  }

  fromLogseq() {
    // TODO load page from logseq
  }

  hasAttachment() {
    return this.attachments && this.attachments.length > 0;
  }

  insertRef() {
    logseq.Editor.insertAtEditingCursor(wrapTag(this.title));
  }

  insertTitle() {
    logseq.Editor.insertAtEditingCursor(this.title);
  }

  async imported() {

    let lsqPage = await logseq.Editor.getPage(this.title)
    return lsqPage != null;
  }
  async create() {
    await logseq.Editor.createPage(
      this.title,
      this.props,
      {
        format: logseq.App.getUserConfigs()["prefferedFormat"],
        redirect: false
      });
  }

  async importFiles() {
    let block = await logseq.Editor.appendBlockInPage(this.title, "[[Attachments]]")

    this.attachments.forEach(attachment => { logseq.Editor.insertBlock(block.uuid, attachment.pageEntry()) })
  }

  async executeImport() {
    // creates @xxx page, 
    // returns pageName.
    // let pageContent = Object.entries(this.convertedItem).map(([key, value]) => `${key}:: ${value}`).join('\n');
    await this.create();
    await this.importFiles();
  }

  async safeImport() {
    // check if the item is already imported. If not, import it.
    if (__debug) console.log("in safeImport", this.props, this.attachments, await this.imported());

    if (!await this.imported()) {

      await this.executeImport();
      // TODO if imported, update 
      // Now we need a smarter strategy to update. 
      // - Replace
      // - Merge
      // Since till now we don't have a two-way sync, we can only replace. 

      // check import status
      let page = this.title;
      if (await this.imported()) {
        logseq.UI.showMsg(page + " imported.");
        return page;
      } else {
        logseq.UI.showMsg("Import failed for " + page);
      }
    }
  }
}