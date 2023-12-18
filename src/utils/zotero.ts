import { Zapi } from "./zapi"
// import { ZoteroItem } from "./zoteroItem";
// More customized searches and post-process based on the Zotero API

let __debug = false;

function itemAttachmentConverter(itemAttachment: any) {
  // preliminary processing of attachment paths
  // TODO exception handling for item without attachment
  let { item, attachmentPaths } = itemAttachment;

  // if (item.version) {
  //   item.version = item.version.toString();
  // }

  if (attachmentPaths) {
    item.attachments = attachmentPaths;
    return item
  }

}

function zoteroAttachmentToButton(path: string) {
  return `{{zotero-linked-file "${path.replace("attachments:", "")}"}}`
}

function zoteroStorageToButton(key: string, path: string) {
  return `{{zotero-imported-file ${key}, "${path.replace("storage:", "")}"}}`
}
export class Zotero {
  static getSelected: any;
  static getRecent: any;
  // A wrapper of set of functions based on Zotero API

  async getSelected() {
    // get items selected in Zotero (not Note) with their attachments
    let queryRes = await Zapi.getSelectedItems();

    let res = queryRes.map(item => itemAttachmentConverter(item))

    if (__debug) {
      console.log("in getSelected", queryRes);
      console.log("in getSelected", queryRes[0].attachmentPaths);
      console.log("in getSelected", res);
    }

    return res
  }
  async getRecent() {
    // get all items (not Note or Attachment)
    // Rank by time modified
    // if keywords is given, filter by keywords, and rank by time modified 
    let queryRes = await Zapi.search([{
      condition: 'dateModified',
      operator: 'is',
      value: 'today'
    }]
    );

    if (__debug) {
      console.log("in getRecent", queryRes);
    }
    // TODO rank by time modified
    return queryRes;
  }
}


export const getRecent = async function () {
  // get all items (not Note or Attachment)
  // Rank by time modified
  // if keywords is given, filter by keywords, and rank by time modified 
  let queryRes = await Zapi.search([{
    condition: 'dateModified',
    operator: 'is',
    value: 'today'
  }]
  );

  if (__debug) {
    console.log("in getRecent", queryRes);
  }
  // TODO rank by time modified
  return queryRes;
}


export const getSelected = async function () {
  // get items selected in Zotero (not Note) with their attachments
  let queryRes = await Zapi.getSelectedItems();

  let res = queryRes.map(item => itemAttachmentConverter(item))

  if (__debug) {
    console.log("in getSelected", queryRes);
    console.log("in getSelected", queryRes[0].attachmentPaths);
    console.log("in getSelected", res);
  }

  return res
}



function camelToKebab(camelCase: string): string {
  return camelCase.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

const wrapTag = (tag: string) => `[[${tag}]]`;

export class zimport {
  // get items selected in Zotero (not Note) with their attachments
  // item: ZoteroItem;
  item: any;

  props: any;
  attachments: any;
  unwantedKeys = [
    'dateAdded',
    'dateModified',
    'collections',
    'key',
    'attachments',
    'relations',
    'version'
  ];
  localLink = (key: any) => `zotero://select/library/items/${key}`;

  constructor(item: any) {
    // this.item = new ZoteroItem(item);
    this.item = item;
    if (__debug) {
      console.log("in zimport \t item to be imported", item);
    }

  }



  async preImport() {
    // REFA make preImport a constructor of certain class. Store the converted item


    // convert this.item to logseq format

    // title => title:: @title
    // creators => authors:: [[name1]], [[name2]] ...
    // tags => tags:: [[tag1]], [[tag2]] ...
    // itemType => item-type:: [[itemtype]]]
    // attachments => 
    // - [[Attachments]]
    //   - `[${attachment 1.basename}](zotero://select/library/items/${key})` 
    //   - `[${attachment 2.filename}]`

    let props = {};
    let attachments = [];
    // TODO note 
    // let notes = {}; 

    for (const [key, value] of Object.entries(this.item)) {
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
          props['tags'] = value.map(tag => wrapTag(tag.tag)).join(', ');
          break;
        case 'attachments':
          for (let key in value) {

            if (__debug) {
              console.log("in preImport \t atta", key, value[key]);
            }

            let attachment = value[key];
            // REFA better way to proecess attachment path. Make it a function or class
            let baseName = attachment.split(/[\/:]/).pop();

            if (attachment.startsWith('storage:')) {

              attachments.push(`[${baseName}](${this.localLink(key)})` + " " + zoteroStorageToButton(key, attachment));
            } else {
              attachments.push(`[${baseName}](${this.localLink(key)})` + " " + zoteroAttachmentToButton(attachment));
            }
          }
          break;
        default:
          // remove unwanted keys
          if (this.unwantedKeys.includes(key)) {
            break;
          }
          props[camelToKebab(key)] = value;
      }
    }

    // create properties that are not in the original item
    props['links'] = `[Local library](${this.localLink(this.item.key)})`;

    this.props = props;
    this.attachments = attachments;
    return { props, attachments };
  }

  async executeImport() {
    // creates @xxx page, 
    // returns pageName.
    // let pageContent = Object.entries(this.convertedItem).map(([key, value]) => `${key}:: ${value}`).join('\n');
    const pageName = this.props.title;
    const pageProp = this.props;

    await logseq.Editor.createPage(
      pageName,
      pageProp,
      {
        format: logseq.App.getUserConfigs()["prefferedFormat"],
        redirect: false
      });

    let block = await logseq.Editor.appendBlockInPage(pageName, "[[Attachments]]")
    this.attachments.forEach(attachment => { logseq.Editor.insertBlock(block.uuid, attachment) })
  }

  async safeImport() {
    // check if the item is already imported. If not, import it.
    if (__debug) console.log("in safeImport", this.item);

    const title = "@" + this.item.title;
    const itemPage = await logseq.Editor.getPage(title);

    this.preImport();
    if (!itemPage) {
      await this.executeImport();
    }
    // TODO if yes, update 
    // Now we need a smarter strategy to update. 
    // - Replace
    // - Merge
    // Since till now we don't have a two-way sync, we can only replace. 

    // check import status
    if (await logseq.Editor.getPage(title)) {
      return title;
    } else {
      logseq.UI.showMsg("Import failed for " + title);
    }
  }

}


export async function importSelectedToCursor() {
  const z = new Zotero();
  const selected = await z.getSelected();
  const insertButton = logseq.settings.insert_button;
  if (__debug) console.log("in importSelectedToCursor \t selected", selected);

  let createdPages = await Promise.all(selected.map(item => new zimport(item).safeImport()));

  if (logseq.Editor.checkEditing()) {
    // REFA make item a class, which has a method to insert itself
    for (let i = 0; i < selected.length; i++) {
      const title = "@" + selected[i].title;

      let insertContent = wrapTag(title);
      if (insertButton && selected[i].attachments) {
        // REFA zotserver: make attachments as a list of {key: {path: path, type: type}}
        insertContent += " ";

        let [firstKey, firstFile] = Object.entries(selected[i].attachments)[0];
        // TODO allow to choose attachment to be inserted 

        if (firstFile.startsWith('storage:')) {
          // TODO Maybe in ZotServer/selected endpoint, we should keep the type of attachment, like "linked-file" or "imported-file"
          insertContent += zoteroStorageToButton(firstKey, firstFile);
        } else {
          insertContent += zoteroAttachmentToButton(firstFile);
        }
      }
      logseq.Editor.insertAtEditingCursor(insertContent);

    }
  }
  else {
    logseq.UI.showMsg(`${createdPages.length} page(s) created.`);
    console.log("PDF Extract: created new pages", createdPages);
  }
}

export async function test_zimport() {
  let selected = await getSelected();
  let zimported = await Promise.all(selected.map(item => new zimport(item).safeImport()));
  console.log("in test_zimport \t zimported", zimported);
}