let __debug = false;

function normalizePath(path) {
  // Replace multiple slashes with a single slash
  path = path.replace(/\/+/g, '/');

  // Replace backslashes with slashes
  path = path.replace(/\\/g, '/');

  // Remove trailing slash
  path = path.replace(/\/$/, '');

  return path;
}

const regex = [
  /(?<=file:)\/+((?:[a-zA-Z]:)?(?:[^<>:"|?*]+)*\.pdf)/,
  /([a-zA-Z]:)?((?:[^<>:"|?*]+)\.pdf)/,
];

const reg_PDFname = /((?:[^<>:"|?*\\\/]+)\.pdf)/;
// C:\folder\subfolder\file.pdf (Windows)
// /folder/subfolder/file.pdf (Linux)
// TODO make zotero root dir configurable
// TODO zotero root dir: either read from logseq zotero settings or from plugin settings 

async function getPDFRoot() {
  let dirs = await logseq.settings["PDF Root"];
  // get dir separated by comma or line break or both
  dirs = dirs.split(/\s*[,\n]{1,}\s*/);
  for (let i = 0; i < dirs.length; i++) {
    dirs[i] = normalizePath(dirs[i]);
    dirs[i] = dirs[i].trim();
  }
  return dirs
}

async function pathParser(path : string) {
  path = normalizePath(path);

  let basename = path.match(reg_PDFname)[1]; 

  path = path.replace("file://", "");

  let zotero_root = await getPDFRoot();
  
  let relPath = ""
  for (let i = 0; i < zotero_root.length; i++) {
    if (path.startsWith(zotero_root[i])) {
      relPath = path.replace(zotero_root[i], "");
    }
  } 
  return [relPath, basename]
}

export async function buttonFromClipboard() {
  window.focus();

  let zotero_root = await getPDFRoot();
  // zotero_root = zotero_root.map(p => normalizePath(p));

  let filePath = "";
  try {
    // Try to read the clipboard as text
    filePath = await navigator.clipboard.readText();
      const [ relPath, basename ] = await pathParser(filePath);
      // TODO allow user to customize if they want to keep file name
      let macro = `${basename} {{zotero-linked-file "${relPath}"}}`
      if (__debug) console.log('File path: ', macro)
      logseq.Editor.insertAtEditingCursor(macro);
      return
  } catch (error) {
    console.log("in error", error);
    // If reading as text fails, handle other types
    const items = await navigator.clipboard.read();
    if (__debug) console.log("in items", items);
    for (const item of items) {
      // if (item.types.includes('application/pdf')) {
      // The clipboard contains a PDF file, so get the path
      const blob = await item.getType('application/pdf');
      if (__debug) console.log("in pdfblob", blob);
      filePath = URL.createObjectURL(blob);
      break;
      // TODO support copied PDF file
      // }
      // Add more else if blocks for other file types as needed
    }
  }

  // Add more else if blocks for other file types as needed
  if (filePath == "") {
    if (__debug) console.log("in buttonFromClipboard", "No valid file path");
    return;
  }
  if (__debug) console.log("after parse clipboard", filePath);
  if (__debug) console.log("zotero root", zotero_root);
}