
import { Attachment } from "./attachment";

let unwantedKeys;
function parse_unwantedKeys() {
  let unwantedKeys = logseq.settings?.unwanted_keys;
  if (unwantedKeys == undefined) {
    return [];
  } else {
    unwantedKeys = unwantedKeys.split(/[\n,\s]+/);
    if (logseq.settings?.alias_citationKey && unwantedKeys.includes('alias')) {
      unwantedKeys.splice(unwantedKeys.indexOf('alias'), 1);
    }
    return unwantedKeys;
  }
}
// TODO any way to dynamically update the unwantedKeys on settings changed ? It's possible in react

logseq.onSettingsChanged(() => { unwantedKeys = parse_unwantedKeys() });

interface ZoteroPage {
  title: string;
  props: { [key: string]: string | string[] | number };
  attachments?: Attachment[];
  notes?: any[];
}

function camelToKebab(camelCase: string): string {
  return camelCase.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

const wrapTag = (tag: string) => `[[${tag}]]`;

const defaultUnwantedKeys = [
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
  title: string; // @title
  props: { [key: string]: string | string[] | number };
  attachments?: Attachment[];
  abstract?: string;

  constructor() { }

  static fromRaw(rawData: any): Page {
    let props = {};
    let attachments;
    let abstract;

    const qAlias: boolean = logseq.settings?.alias_citationKey

    // TODO note 
    // let notes = {}; 
    if (debug_zotero) console.log("in fromRaw", rawData);

    for (const [key, value] of Object.entries(rawData)) {
      switch (key) {
        case 'title':
          props['original-title'] = value;
          props['title'] = `@${value}`;
          break;
        case 'itemType':
          props['item-type'] = wrapTag(value);
          break;
        case 'creators':
          // TODO check creatorType (usually 'author', but can be other values )
          props['authors'] = value.map(creator => wrapTag(creator.firstName + ' ' + creator.lastName)).join(', ');
          break;
        case 'tags':
          if (value.length == 0) break;
          props['tags'] = value.map(tag => wrapTag(tag)).join(', ');
          break;
        case 'attachments':
          attachments = value;
          break;
        case 'abstractNote':
          abstract = value;
          break;
        case 'citationKey':
          if (qAlias) {
            props['alias'] = wrapTag(value);
          }
          break;
        default:
          // remove unwanted keys
          if (defaultUnwantedKeys.includes(key)) {
            break;
          }
          props[camelToKebab(key)] = value;
      }
    }

    // create properties that are not in the original item
    props['links'] = `[Local library](zotero://select/library/items/${rawData.key})`;

    let page = new Page();
    page.title = props['title'];
    for (const key of unwantedKeys) {
      delete props[key];
    }
    page.props = props;
    if (attachments) {
      page.attachments = attachments.map(attachment => Attachment.fromRaw(attachment));
    }
    if (abstract) {
      page.abstract = abstract;
    }
    return page
  }

  fromLogseq() {
    // TODO load page from logseq
  }

  hasAttachment() {
    return this.attachments && this.attachments.length > 0;
  }

  insertAliasRef() {
    logseq.Editor.insertAtEditingCursor(this.props['alias']);
  }

  safeInsertAliasRef() {
    // alias is optional
    if (this.props['alias'] == undefined) {
      this.insertRef();
      return
    }
    this.insertAliasRef();
  }

  insertRef() {
    // [[@title]]
    logseq.Editor.insertAtEditingCursor(wrapTag(this.title));
  }

  insertTitle() {
    // @title
    logseq.Editor.insertAtEditingCursor(this.title);
  }

  async imported() {
    // FIXME maybe empty page should be considered as not imported
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

  async importAbstract() {
    if (!this.abstract) return;
    let block = await logseq.Editor.appendBlockInPage(this.title, "[[Abstract]]")
    logseq.Editor.insertBlock(block.uuid, this.abstract)
  }

  async importAttachments() {
    if (!this.hasAttachment()) return;
    let block = await logseq.Editor.appendBlockInPage(this.title, "[[Attachments]]")

    this.attachments.forEach(attachment => { logseq.Editor.insertBlock(block.uuid, attachment.pageEntry()) })
  }

  async executeImport() {
    // creates @xxx page, 
    await this.create();
    await this.importAbstract();
    await this.importAttachments();
  }

  async safeImport() {
    // check if the item is already imported. If not, import it.
    if (debug_zotero) console.log("in safeImport", this.props, this.attachments, await this.imported());

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