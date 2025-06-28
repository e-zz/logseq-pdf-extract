// Customized searches and post-process based on the Zotero API

import { Zapi, Zapi7 } from "./zapi"
import { ZoteroItems } from "./item";



export class Zotero {
  // A wrapper of set of functions based on Zotero API

  api: Zapi7 | Zapi; // Zotero 7 API or Zotserver API

  constructor() {
    // TODO check Zotero7 or Zotserver automatically
    if (logseq.settings?.zotero_ver === 'Zotero 7') {
      this.api = new Zapi7();
    }
    else {
      this.api = new Zapi();
    }
  }

  async search(keyword: string) {
    let res = await this.api.getByEverything(keyword)
    if (debug_zotero) console.log("in Zotero.search:\t", res);
    return res
  }

  async getByKeys(keys: string[]) {
    let res = await this.api.getItemByKeys(keys);
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

  // TODO implement the function returning a string according to the template
  static async to_cursor_template(props: any, template: string) {
    let res = template;

    // Handle fallback syntax first: {{primary:fallback}}
    res = res.replace(/{{([\w-]+):([\w-]+)}}/g, (match, primary, fallback) => {
      if (props[primary] && props[primary].toString().trim()) {
        return props[primary];
      } else if (props[fallback] && props[fallback].toString().trim()) {
        return props[fallback];
      } else {
        return '';
      }
    });


    for (const [key, value] of Object.entries(props)) {
      if (value) {
        res = res.replace(`{{${key}}}`, value);
      } else {
        res = res.replace(`{{${key}}}`, '');
      }
    }

    // if a key used in the template is not in props, remove it
    res = res.replace(/{{[\w-]+}}/g, '');

    // check if template has been filled
    if (res === template) {
      console.warn("Zotero.to_cursor_template: template not filled");
      return "Zotero.to_cursor_template: template not filled";
    }
    return res;
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
        let props = itemPage.props;

        // Add props['pdfButton'] if the item has attachments
        if (logseq.settings.insert_button && itemPage.hasAttachment()) {
          const pdfButtons = [];
          for (let j = 0; j < itemPage.attachments.length; j++) {
            let atta = itemPage.attachments[j];
            if (atta.contentType === 'application/pdf') {
              // Get the button and add to array
              const button = atta.button || '';
              if (button) {
                pdfButtons.push(button);
              }
            }
          }
          // Add the collected PDF buttons to props
          if (pdfButtons.length > 0) {
            props['pdfButton'] = pdfButtons.join(' ');
          }
        }

        // extra props or keys
        props['ref'] = itemPage.ref();
        props['abstract'] = itemPage.abstract;
        props['year'] = props['date']?.split('-')[0];
        props['journal'] = props['publication-title'];

        if (debug_zotero) console.log("in Zotero.safeImportToCursor\titemPage.props:", props);

        let entry = await this.to_cursor_template(props, logseq.settings?.insert_template);

        logseq.Editor.insertAtEditingCursor(entry)
      }
    }
  }
}

export async function importSelectedToCursor() {
  let selected = await Zotero.getSelected();
  if (debug_zotero) console.log("in importSelectedToCursor \t selected", selected);
  await Zotero.safeImportToCursor(selected);
}