// Customized searches and post-process based on the Zotero API

import { Zapi } from "./zapi"
import { ZoteroItems } from "./item";

let __debug = false;


export class Zotero {
  // A wrapper of set of functions based on Zotero API

  static async search(keyword: string) {
    let res = await Zapi.getByEverything(keyword)
    if (__debug) console.log(res);
    return res
  }

  static async getByKeys(keys: string[]) {
    let res = await Zapi.getItemByKeys(keys);
    if (res) {
      res = ZoteroItems.fromRaw(res);

      if (__debug) console.log(res);

      return res
    }
  }
  static async getSelectedRawItems() {
    // get items selected in Zotero (not Note) with their attachments
    let res = await Zapi.getBySelection();

    res = res.map((i) => i.item)
    if (__debug) {
      console.log("in getSelectedRaw", res);
    }

    return res
  }
  static async getSelected() {
    // get items selected in Zotero (not Note) with their attachments
    let res = ZoteroItems.fromRaw(await Zapi.getBySelection());

    if (__debug) {
      console.log("in getSelected", res);
    }

    return res
  }
  static async getRecent() {
    // get all items (not Note or Attachment)
    // Rank by time modified
    // if keywords is given, filter by keywords, and rank by time modified 
    let queryRes = await Zapi.search([{
      condition: 'dateModified',
      operator: 'is',
      value: 'today'
    }]
    );

    queryRes = ZoteroItems.fromRaw(queryRes);

    if (__debug) {
      console.log("in getRecent", queryRes);
    }
    // TODO rank by time modified
    return queryRes;
  }

  static async safeImportToCursor(items: ZoteroItems) {
    // import items to cursor
    // if items is empty, import se
    await Promise.all(items.map(item => item.page.safeImport()));

    if (await logseq.Editor.checkEditing()) {

      let qAlias = logseq.settings?.alias_citationKey;

      if (__debug) console.log("q_alias", qAlias);

      for (let i = 0; i < items.items.length; i++) {

        let itemPage = items.items[i].page;
        // TODO option: insert title or page Ref
        // itemPage.insertTitle();

        if (qAlias) {
          itemPage.safeInsertAliasRef();
        } else {
          itemPage.insertRef();
        }

        if (logseq.settings.insert_button && itemPage.hasAttachment()) {
          for (let j = 0; j < itemPage.attachments.length; j++) {
            let atta = itemPage.attachments[j];
            if (atta.contentType === 'application/pdf') atta.insertButton()
          }
        }

      }
    }
  }
}

export async function importSelectedToCursor() {
  let selected = await Zotero.getSelected();
  if (__debug) console.log("in importSelectedToCursor \t selected", selected);
  await Zotero.safeImportToCursor(selected);
}