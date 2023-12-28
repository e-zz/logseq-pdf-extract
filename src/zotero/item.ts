// Adapted from https://github.com/vanakat/zotero-bridge/blob/main/src/ZoteroItem.ts 

import { Zotero as ZoteroModel } from "../typings/zotero";
import { Page } from "./page";

export class ZoteroItem {

  raw: ZoteroModel.Item.Any;
  page: Page;
  key: string;
  // use more specific ZoteroItem.fromRaw() instead
  constructor() {
  }

  // @arg raw: raw data from Zotero API (Zapi)
  static fromRaw(rawData: any): ZoteroItem {

    let { item: raw, attachments } = rawData;
    // It might change accordingly if the return format of Zapi changes


    if (raw.tags) {
      raw.tags = raw.tags.map((tag: any) => tag.tag);
    }

    if (attachments) {
      raw.attachments = attachments;
      // TODO exception handling for item without attachment
    }

    let zoteroItem = new ZoteroItem();
    zoteroItem.raw = raw
    zoteroItem.key = raw.key;
    zoteroItem.page = Page.fromRaw(raw);
    return zoteroItem
  }

  getKey() {
    return this.raw.key;
  }

  hasAttachment() {
    return this.raw.attachments && this.raw.attachments.length > 0;
  }

  getRef() {
    let ref = `[[${this.page.title}]]`
    // TODO allow to choose attachment to be inserted or insert all PDF (by attachment.contentType === 'application/pdf')
    if (logseq.settings.insert_button && this.hasAttachment()) {
      ref += this.page.attachments[0].button;
    }
    return ref
  }
  // getTitle() {
  //   return this.raw.shortTitle || this.raw.title || this.getNoteExcerpt() || '[No Title]';
  // }

  // @todo: some transformations in this class should be moved to ZotServer
  // breaking changes for ZotServer v2
  getAuthors() {
    return this.getCreators()
      .filter(creator => creator.creatorType === 'author')
      .map(this.normalizeName);
  }

  getAuthor() {
    return this.getAuthors()[0];
  }

  getCreators() {
    return this.raw.creators || [];
  }

  getDate() {
    return this.raw.date ? this.formatDate(this.raw.date) : '';
  }

  getNoteExcerpt() {
    if (this.raw.note) {
      const div = document.createElement('div');
      div.appendChild(
        // sanitizeHTMLToDom(
        this.raw.note
        // )
      );
      return (div.textContent || div.innerText || '').trim().substring(0, 50) + '...';
    }

    return '';
  }

  normalizeName(creator: any) {
    const names = {
      firstName: creator.firstName,
      lastName: creator.lastName,
      fullName: ''
    }

    if (creator.hasOwnProperty('name')) {
      const delimiter = creator.name.lastIndexOf(' ');
      names.firstName = creator.name.substring(0, delimiter + 1).trim();
      names.lastName = creator.name.substring(delimiter).trim();
      names.fullName = creator.name;

    } else {
      names.fullName = `${names.firstName} ${names.lastName}`;
    }


    return names;
  }

  formatDate(date: string) {
    const dateObject = new Date(date);

    return {
      year: dateObject.getFullYear(),
      month: dateObject.getMonth(),
      day: dateObject.getDate()
    }
  }

  getValues() {
    return {
      key: this.getKey(),
      title: this.getTitle(),
      date: this.getDate(),
      authors: this.getAuthors(),
      firstAuthor: this.getAuthor(),
    };
  }
}


/** @public */
// wrapper class for Zotero item, Zotero API (Zapi) data
export class ZoteroItems {
  items: ZoteroItem[];

  constructor(items?: ZoteroItem[]) {
    this.items = items || [];
  }

  static fromRaw(rawData: any[]) {
    // check if rawData is an array or similiar

    let zoteroItems = new ZoteroItems();
    zoteroItems.items = rawData.map((item: any) => ZoteroItem.fromRaw(item));
    return zoteroItems;
  }

  add(item: ZoteroItem) {
    this.items.push(item);
  }

  combine(other: ZoteroItems) {
    this.items = this.items.concat(other.items);
  }

  map(func: (item: ZoteroItem) => any) {
    return this.items.map(func);
  }
  filter(func: (item: ZoteroItem) => boolean) {
    return this.items.filter(func);
  }
}