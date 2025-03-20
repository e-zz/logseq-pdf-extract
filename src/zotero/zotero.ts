// Customized searches and post-process based on the Zotero API

import { Zapi } from "./zapi"
import { ZoteroItems } from "./item";



export class Zotero {
  // A wrapper of set of functions based on Zotero API

  static async search(keyword: string) {
    let res = await Zapi.getByEverything(keyword)
    if (debug_zotero) console.log("in Zotero.search:\t", res);
    return res
  }

  static async getByKeys(keys: string[]) {
    let res = await Zapi.getItemByKeys(keys);
    if (res) {
      res = ZoteroItems.fromRaw(res);

      if (debug_zotero) console.log("in Zotero.getByKeys:\t", res);

      return res
    }
  }
  static async getSelectedRawItems() {
    // get items selected in Zotero (not Note) with their attachments
    let res = await Zapi.getBySelection();

    res = res.map((i) => i.item)

    if (debug_zotero) console.log("in Zotero.getSelectedRaw:\t", res);

    return res
  }
  static async getSelected() {
    // get items selected in Zotero (not Note) with their attachments
    let res = ZoteroItems.fromRaw(await Zapi.getBySelection());

    if (debug_zotero) console.log("in Zotero.getSelected\t", res);

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

    if (debug_zotero) console.log("in Zotero.getRecent", queryRes);

    // TODO rank by time modified
    return queryRes;
  }

  static async safeImportToCursor(items: ZoteroItems) {
    // import items to cursor
    // if items is empty, import se
    await Promise.all(items.map(item => item.page.safeImport()));
    // TODO. Refactor
    // 1. avant_import hooks: check page existance, check import settings (e.g. alias, template. LATER: in future, possibly allow to force update by overwriting, or update by merging)
    // 2. import: template string (page metadata) of a single entry, button
    // 3. apres_import hooks: notification, write to cursor
    if (debug_zotero) console.log("in Zotero.safeImportToCursor\titems:", items);

    if (await logseq.Editor.checkEditing()) {

      let qAlias = logseq.settings?.alias_citationKey;

      if (debug_zotero) console.log("q_alias", qAlias);

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

        // TODO template string for inserToCursor
        // if (logseq.settings.insert_button && itemPage.hasAttachment()) {
        //   for (let j = 0; j < itemPage.attachments.length; j++) {
        //     let atta = itemPage.attachments[j];
        //     if (atta.contentType === 'application/pdf') atta.button
        //   }
        // }

        if (i < items.items.length - 1) logseq.Editor.insertAtEditingCursor(' \n');

      }
    }
  }
}

export async function importSelectedToCursor() {
  let selected = await Zotero.getSelected();
  if (debug_zotero) console.log("in importSelectedToCursor \t selected", selected);
  await Zotero.safeImportToCursor(selected);
}