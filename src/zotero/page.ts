
import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
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

// TODO combine this with unwantedKeys in settings (use the list below as default)
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

  constructor(props, attachments, abstract) {
    const filteredProps = Object.keys(props)
      .filter(key => !unwantedKeys.includes(key))
      .reduce((obj, key) => {
        obj[key] = props[key];
        return obj;
      }, {});

    this.props = filteredProps;
    this.title = props['title'];
    this.attachments = attachments ? attachments.map(Attachment.fromRaw) : undefined;
    this.abstract = abstract || undefined;
  }

  static fromRaw(rawData: any, aux: any): Page {
    let props = {};
    let attachments;
    let abstract;
    let baseName = aux?.baseName;

    const qAlias: boolean = logseq.settings?.alias_citationKey;
    const qZoteroTitle: boolean = logseq.settings?.title_zotero_basename;

    // TODO note 
    // let notes = {}; 
    if (debug_zotero) console.log("in fromRaw", rawData);

    for (const [key, value] of Object.entries(rawData)) {
      switch (key) {
        case 'title':
          props['original-title'] = value;
          props['title'] = `@${value}`;
          if (qZoteroTitle) props['title'] = `@${baseName}`;
          break;
        case 'itemType':
          props['item-type'] = wrapTag(value);
          break;
        case 'creators':
          // TODO check creatorType (usually 'author', but can be other values )
          props['authors'] = value.map(creator => {
            if ('name' in creator) {
              // Handle organizational authors with single 'name' field
              return wrapTag(creator.name);
            } else {
              // Handle regular authors with firstName and lastName
              return wrapTag(creator.firstName + ' ' + creator.lastName);
            }
          }).join(', ');
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

    let page = new Page(props, attachments, abstract);
    return page;
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

  /**
   * Update page alias
   * @param page_uuid 
   * @param alias_key [[citationKey]]
   */
  async updateAlias(page_uuid: string, alias_key: string) {
    // updateBlock is preferred over upsertBlockProperty due to the reason mentioned in https://plugins-doc.logseq.com/logseq/Editor/upsertBlockProperty
    // await logseq.Editor.upsertBlockProperty(page.uuid, "alias", alias_key);
    let pg = await logseq.Editor.getPageBlocksTree(page_uuid);
    let props: BlockEntity = pg[0];

    let block_content = props.content;
    if (!block_content.includes("alias::")) {
      // if alias not exists, add it
      block_content = `alias:: ${alias_key}\n${block_content}`;
    } else {
      // if alias is there, check if it needs to be updated
      block_content = block_content.split('\n').map(line => {
        if (line.includes("alias::") && !line.includes(alias_key)) {
          line += ` ${alias_key}`;
        }
        return line;
      }).join('\n');
    }

    await logseq.Editor.updateBlock(props.uuid, block_content);
  }

  ref() {
    // [[@title]]
    return wrapTag(this.title);
  }

  insertRef() {
    // [[@title]]
    logseq.Editor.insertAtEditingCursor(this.ref());
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
    } else {
      // If imported, check if the citation key alias needs to be updated
      if (logseq.settings?.alias_citationKey) {
        let lsqPage = await logseq.Editor.getPage(this.title)
        this.updateAlias(lsqPage.uuid, this.props['citationKey']);
        // FIXME handle the case when page with the same name or alias exists
      }

    }
  }
}