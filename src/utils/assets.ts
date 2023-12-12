export async function findFile(fileId) {
  const graph = await logseq.App.getCurrentGraph();

  // FIXME: restore special characters in file name (e.g. $)
  // qn/pair/BCS/Serban et al_2021_Structure of the quartetting ground state of $$N=Z$$nuclei.pdf
  // const matches = await logseq.DB.datascriptQuery(
  //   `[:find ?file
  //               :where
  //               [?b :file/path ?file]
  //               [(== ?b ${fileId})]
  //           ]`
  // );

  const page = await logseq.Editor.getPage(fileId);

  if (page) {
    const file = graph.url.replace("logseq_local_", "") + "/assets/" + page.originalName.replace("hls__", "");
    return file;
  } else {
    return null;
  }
}


export async function getAreaBlockAssetUrl(uuid, page_id) {
  const props = await logseq.Editor.getBlockProperties(uuid)
  const { id, hlStamp, hlPage } = props;

  let file_assets = await findFile(page_id);
  console.log("file_name", page_id, file_assets);

  if (props && page_id && id) {

    // const hlPage = props['hl-page'];
    // const encodedChars = /%[0-9a-f]{2}/i.test(groupKey);
    // groupKey = encodedChars ? encodeURI(groupKey) : groupKey;
    let res = `${file_assets}/${hlPage}_${id}_${hlStamp}.png`;
    console.log("res", res);

    return res
  }
  return null;
}