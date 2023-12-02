import { fs } from 'fs';
import path from 'path';
import fuzzysort from 'fuzzysort';

// Function to get all files in a directory recursively
export const getFiles = async (dirPath) => {
  let files = await fs.readdir(dirPath);
  let filelist = [];
  for (let file of files) {
    const absolutePath = path.join(dirPath, file);
    if ((await fs.stat(absolutePath)).isDirectory()) {
      filelist = filelist.concat(await getFiles(absolutePath));
    } else {
      filelist.push(absolutePath);
    }
  }
  return filelist;
}

// Function to perform a fuzzy search on the file names
export const fuzzySearch = (query, files) => {
  return fuzzysort.go(query, files, {limit: 10}); // limit to 10 results
}
