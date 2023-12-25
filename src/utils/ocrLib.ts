let __debug = false;
export async function readOcr(uuid) {
  // let content = await logseq.Editor.getBlock(uuid);
  let prop = await logseq.Editor.getBlockProperty(uuid, "ocr")
  if (!prop) {
    return ""
  }
  return prop.replaceAll("$$", "");
}

export async function updateOcr(uuid) {
  // block of uuid must appear on current page
  const img = top.document.getElementById(`block-content-${uuid}`).querySelector("img");
  let tex = await ocr(img);
  // update block ocr:: property 
  await logseq.Editor.upsertBlockProperty(uuid, "ocr", `$$${tex}$$`);
  return tex
}

async function getTexFromHuggingFace(blob) {
  const access_token = logseq.settings!["HuggingFace User Access Token"]
  const response = await fetch(
    "https://api-inference.huggingface.co/models/Norm/nougat-latex-base",
    {
      headers: { Authorization: `Bearer ${access_token}` },
      method: "POST",
      body: blob,
    }
  );

  const result = await response.json();

  // If there is an error, wait for the estimated time and retry
  if (result.error) {
    console.log('error: ', result.error);
    console.log('estimated_time: ', result.estimated_time);
    logseq.UI.showMsg(`${result.error}. Result will be retrieved in ${result.estimated_time} seconds.`);

    // Convert the estimated_time from seconds to milliseconds
    const waitTime = result.estimated_time * 1000;
    if (waitTime) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(getTexFromHuggingFace(blob));
        }, waitTime);
      });
    } else {
      logseq.UI.showMsg(`Wait time ${waitTime}`);
    }
  }

  // If there is no error, return the result
  if (__debug) {
    console.log('result: ', result);
    console.log('result[0].generated_text: ', result[0].generated_text);
  }
  return result[0].generated_text;
}



// Function to create and setup a canvas
function createCanvas(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Ensure canvas is the same size as the image
  canvas.width = img.width;
  canvas.height = img.height;

  // Draw the image onto the canvas
  ctx.drawImage(img, 0, 0, img.width, img.height);

  return canvas;
}

// Function to create a blob from a canvas
function createBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

async function ocr(img) {

  // <img> to <canvas> to blob
  const canvas = createCanvas(img);
  const blob = await createBlob(canvas);

  // OCR
  const tex = await getTexFromHuggingFace(blob);

  return tex;
}

// TODO ocr from local path: how to read image from assets folder?
// export async function ocrFromLocalPath(path) {
//   // return new Promise((path, reject) => {
//   const img = new Image();
//   img.onload = async () => {
//     const canvas = document.createElement('canvas');
//     const ctx = canvas.getContext('2d');

//     // Ensure canvas is the same size as the image
//     canvas.width = img.width;
//     canvas.height = img.height;

//     // Draw the image onto the canvas
//     ctx.drawImage(img, 0, 0, img.width, img.height);

//     // Convert the canvas to a Blob
//     const blob = await new Promise(path => canvas.toBlob(path, 'image/png'));

//     // OCR
//     const tex = await getTexFromHuggingFace(blob);

//     console.log("tex", tex);

//   };
//   // img.onerror = reject;
//   img.src = path;
//   // });
// }