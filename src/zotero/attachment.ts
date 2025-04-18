
const buttonLinkedFile = (path: string) =>
  `{{zotero-linked-file "${path.replace("attachments:", "")}"}}`

const buttonImportedFile = (key: string, path: string) => `{{zotero-imported-file ${key}, "${path.replace("storage:", "")}"}}`

const mdLink = (text: string, link: string) => `[${text}](${link})`

export class Attachment {

  key: string;
  linkMode: string; // "imported_file" | "linked_file" | "imported_url" | "imported_snapshot"
  contentType: string;
  localLink?: string;
  baseName?: string;
  relPath?: string;
  button?: string;

  constructor() {
  }

  static fromRaw(raw: any): Attachment {
    let file = new Attachment();

    if (debug_zotero) {
      console.log("=========  in fromRaw  =========");
      console.log("raw:", raw);
    }

    file.baseName = raw.filename;
    file.relPath = raw.filename;
    file.key = raw.key
    file.localLink = `zotero://select/library/items/${raw.key}`;
    file.linkMode = raw.linkMode;
    file.contentType = raw.contentType;
    

    if (debug_zotero) {
      console.log("file:", file);
      console.log("linkMode:\n\t", file.linkMode);
    }

    switch (file.linkMode) {
      case "imported_file":
        file.button = buttonImportedFile(file.key, file.relPath);
        if (debug_zotero) console.log("imported_file\tbutton:", file.button);
        break;
      case "linked_file":
        file.baseName = raw.path.split(/[:\/]/).pop(); // Warn: The name of a PDF could be different from it's raw.title
        file.relPath = raw.path.replace("attachments:", "");
        file.button = buttonLinkedFile(file.relPath);
        if (debug_zotero) console.log("linked_file\tbutton:", file.button);
        break;
      case "imported_url":
        // TODO for PDF with linkMode "imported_url", should we use file.localLink="zotero://select/library/items/${raw.key}"?
        file.localLink = raw.url;
        file.button = buttonImportedFile(file.key, file.relPath);
        if (debug_zotero) console.log("imported_url\tbutton:", file.button);
        break;
      default:
        console.log(`Unhandled linkMode ${file.linkMode} for ${file.localLink}`);
    }

    if (debug_zotero) console.log("===============================", raw);
    return file
  }

  static fromLogseq(block: any) {
    // TODO
  }

  pageEntry() {
    // [title](localLink) [button]
    return mdLink(this.baseName, this.localLink) + " " + this.button;
  }

  insertButton() {
    logseq.Editor.insertAtEditingCursor(this.button);
  }
}