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
}


export async function importSelectedToCursor() {
  let selected = await Zotero.getSelected();

  if (__debug) console.log("in importSelectedToCursor \t selected", selected);

  await Promise.all(selected.map(item => item.page.safeImport()));

  if (await logseq.Editor.checkEditing()) {
    for (let i = 0; i < selected.items.length; i++) {

      let itemPage = selected.items[i].page;
      // itemPage.insertTitle();
      itemPage.insertRef();

      if (logseq.settings.insert_button && itemPage.hasAttachment()) {
        for (let j = 0; j < itemPage.attachments.length; j++) {
          let atta = itemPage.attachments[j];
          if (atta.contentType === 'application/pdf') atta.insertButton()
        }
      }

    }
  }
}