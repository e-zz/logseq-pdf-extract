import { isDbGraph, setProp } from "./graph";

// FIXME : load settings after the plugin is fully initialized
async function getContent(ref_id) {
  let ref_block = (await logseq.Editor.getBlock(ref_id)).content;
  // console.log("in getContent", content);


  if (debug_hl) {
    console.log("in getContent 1", ref_block, ref_block[0]);
    console.log("in getContent 2", ref_block[0][0].split('\n'));
  }

  // FIX use regex to get rid of `prop::`
  // following lines assume prop:: only appears at the end of the block 
  let ref_block_cleaned = ref_block.split('\n');

  if (debug_hl) {
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
    if (debug_hl) {
      console.log(`No valid content for ${uuid}`);
    }
    return { content: ref, propRef: null }
  }

  const prop = logseq.settings.prop_name;
  const ls_type = await logseq.Editor.getBlockProperty(uuid, "ls-type")

  if (debug_hl) {
    console.log("extract uuid", uuid);
    console.log("\t ls_type ", ls_type);
  }

  if (ls_type) {

    // `((ref))` extraction. On MD graphs the block-ref target property
    // (prop_name) is embedded inline in the block text (`prop:: ((uuid))`), as
    // the original did; on DB graphs it is stored as a real property on the
    // edited block (set in extractBlock). The replacement content differs
    // accordingly so MD text behaviour is unchanged.
    if (await isDbGraph()) {
      return { content: formatStyle(ref_content), propRef: prop != "" ? ref : null }
    }
    let prop_uuid = "";
    if (prop != "") {
      prop_uuid = `\n${prop}:: ${ref}\n`
    }
    return { content: prop_uuid + formatStyle(ref_content), propRef: null }

  }
  return { content: "", propRef: null }
}

const pattern_block_ref = /\(\(([\w-]*?)\)\)/g;
async function extractBlock(block) {
  // TODO Fix: edge cases of reconstruction of a block containing ref(s)
  // 1. multiple refs in a block
  // 2. DONE ref surrounded by text

  const block_content = block.content;
  if (debug_hl) {
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
    newContent = newContent.replace(matches[i][0], replacements[i].content);
  }

  if (debug_hl) { console.log("in ref ", newContent.trim()) }

  await logseq.Editor.updateBlock(block.uuid, newContent.trim());

  // Property write for the extracted refs (DB graphs only; on MD graphs the
  // `prop::` line is already embedded inline in the content above).
  const db = await isDbGraph();
  if (db) {
    const prop = logseq.settings.prop_name;
    if (prop != "") {
      const propRefs = replacements
        .map(r => r.propRef)
        .filter(r => r != null);
      if (propRefs.length > 0) {
        await setProp(block.uuid, prop, propRefs.length > 1 ? propRefs : propRefs[0], { reset: true });
      }
    }
  }
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