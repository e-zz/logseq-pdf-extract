import { readOcr, updateOcr } from "./ocrLib"
import { wrapAreaIdTex } from "./texLib";

const __debug = logseq.settings.debug_hl;
async function getContent(ref_id) {
  let ref_block = (await logseq.Editor.getBlock(ref_id)).content;
  // console.log("in getContent", content);


  if (__debug) {
    console.log("in getContent 1", ref_block, ref_block[0]);
    console.log("in getContent 2", ref_block[0][0].split('\n'));
  }

  // FIX use regex to get rid of `prop::`
  // following lines assume prop:: only appears at the end of the block 
  let ref_block_cleaned = ref_block.split('\n');

  if (__debug) {
    console.log("in getContent 3", ref_block_cleaned);
    console.log(ref_block_cleaned[0]);
  }

  if (ref_block_cleaned.length > 0) {
    return ref_block_cleaned[0];
  }
  return "";
}


function formatStyle(excerpt) {
  const style = logseq.settings.excerpt_style;
  return style.replace("{{excerpt}}", excerpt);
}

async function extractRef(uuid) {
  // convert a uuid of annotation to wanted format 
  let ref_content = await getContent(uuid);
  let ref = `((${uuid}))`;

  // cases handling
  if (ref_content == "") {
    if (__debug) {
      console.log(`No valid content for ${uuid}`);
    }
    return ref
  }

  let prop_uuid = "";
  const prop = logseq.settings.prop_name;
  if (prop != "") {
    prop_uuid = `\n${prop}:: ${ref}\n`
  }

  const hl_type = await logseq.Editor.getBlockProperty(uuid, "hl-type")
  const ls_type = await logseq.Editor.getBlockProperty(uuid, "ls-type")

  if (__debug) {
    console.log("extract uuid", uuid);
    console.log("\t hl_type ", hl_type);
    console.log("\t ls_type ", ls_type);
  }

  if (ls_type && !hl_type) {

    return prop_uuid + formatStyle(ref_content)

  } else if (hl_type == "area") {

    let prop_ocr = await readOcr(uuid);
    if (prop_ocr == "") {
      prop_ocr = await updateOcr(uuid);
    }
    return wrapAreaIdTex(prop_ocr, uuid)

  }

}

const pattern_block_ref = /\(\(([\w-]*?)\)\)/g;
async function extractBlock(block) {
  // TODO Fix: edge cases of reconstruction of a block containing ref(s)
  // 1. multiple refs in a block  
  // 2. DONE ref surrounded by text 

  const block_content = block.content;
  if (__debug) {
    console.log("in openCurrentLine block\t", block);
    console.log("in openCurrentLine block_content\t", block_content);
  }

  const matches = [...block_content.matchAll(pattern_block_ref)];

  const replacements = await Promise.all(matches.map(async match => {
    return await extractRef(match[1]);
  }));

  // Replace each match in the original string
  let newContent = block_content;
  for (let i = 0; i < matches.length; i++) {
    newContent = newContent.replace(matches[i][0], replacements[i]);
  }

  if (__debug) { console.log("in ref ", newContent.trim()) }

  await logseq.Editor.updateBlock(block.uuid, newContent.trim());
}

export async function extractEditor() {
  const blocks = await logseq.Editor.getSelectedBlocks();
  if (blocks?.length > 0) {
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index];
      await extractBlock(block);
    }
    return;
  }

  const block = await logseq.Editor.getCurrentBlock();
  await extractBlock(block);
}