
export async function readOcr(uuid) {
  // let content = await logseq.Editor.getBlock(uuid);
  let prop = await logseq.Editor.getBlockProperty(uuid, "ocr")
  // console.log("prop", prop);
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

export async function addOCRButton(mutationItems?: HTMLElement[]) {
  // add OCR button to area highlight elements in each mutationItem or to all area hightlight elements in the current page
  if (!mutationItems) {
    let doc = top.document;
    mutationItems = [...doc.querySelectorAll('#app-container span.hl-area span.actions')] as HTMLElement[];
  }

  for (let i = 0; i < mutationItems.length; i++) {
    let actions = mutationItems[i];
    if (actions.querySelector('button[title="TeX-OCR"]')) {
      continue;
    }
    // Create a new button element
    let button = document.createElement('button');

    // Set the button's properties
    button.title = "TeX-OCR";
    button.tabIndex = -1;
    button.className = "asset-action-btn px-1";

    const _button = actions.querySelector('button').innerHTML;
    // TODO replace the svg icon
    // // Create an SVG element
    // let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    // svg.setAttribute('viewBox', '0 0 100 100'); // Set the viewBox attribute to your SVG content's aspect ratio

    // // Create a path element for the SVG
    // let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    // path.setAttribute('d', 'M10 10 H 90 V 90 H 10 Z'); // Set the 'd' attribute to your SVG path data

    // // Append the path to the SVG
    // svg.appendChild(path);

    // // Create a span element
    // let span = document.createElement('span');
    // span.className = "ui__icon ti ls-icon-maximize";

    // // Append the SVG to the span
    // span.appendChild(svg);

    // // Append the span to the button
    // button.appendChild(span);
    button.addEventListener('mousedown', (e) => {
      e.stopImmediatePropagation();
    });

    button.addEventListener('click', async (e) => {
      e.stopImmediatePropagation();
      // Code to execute when the button is clicked
      // console.log('Button was clicked!');

      const divWrapper = e.target.closest("div[data-type='annotation']");
      // console.log("divWrapper", divWrapper);

      let uuid = divWrapper?.getAttribute("blockid");
      // console.log("uuid", uuid);

      let tex = await readOcr(uuid);

      if (!tex) {
        // perform ocr
        // const img = e.target.parentElement.parentElement.nextElementSibling;
        // tex = await ocr(img);
        // // update block ocr:: property 
        // await logseq.Editor.upsertBlockProperty(uuid, "ocr", tex);
        tex = await updateOcr(uuid);
      }
      window.focus();
      // copy TeX to clipboard
      await navigator.clipboard.writeText(tex);
    });

    button.innerHTML = _button;
    // Insert the button at the beginning of the action element's child nodes
    actions.appendChild(button);
  }

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

    // Convert the estimated_time from seconds to milliseconds
    const waitTime = result.estimated_time * 1000;
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getTexFromHuggingFace(blob));
      }, waitTime);
    });
  }

  // If there is no error, return the result
  console.log('result: ', result);
  console.log('result[0].generated_text: ', result[0].generated_text);
  return result[0].generated_text;
}

export function wrapTex(t: string, uuid: string) {
  let texStyle = logseq.settings.area_style;
  console.log("texStyle", texStyle);
  console.log("t", t);


  if (texStyle) {
    texStyle = texStyle.replace("tex", t);
    console.log("texStyle 2", texStyle);

    if (uuid !== "") {
      texStyle = texStyle.replace("uuid", uuid);
      console.log("texStyle 3", texStyle);

    }
    return texStyle;
  }
  return "$$" + t + "$$"
}
export async function ocr(img) {

  // === Get the image element
  // const pic = await fetch(img.src);
  // const blob = await pic.blob();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Ensure canvas is the same size as the image
  canvas.width = img.width;
  canvas.height = img.height;

  // Draw the image onto the canvas
  ctx.drawImage(img, 0, 0, img.width, img.height);


  // Convert the canvas to a Blob
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

  // === OCR
  const tex = await getTexFromHuggingFace(blob);

  return tex
}

// TODO ocr from local path: how to load image from local path
export async function ocrFromLocalPath(path) {
  // return new Promise((path, reject) => {
  const img = new Image();
  img.onload = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Ensure canvas is the same size as the image
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // Convert the canvas to a Blob
    const blob = await new Promise(path => canvas.toBlob(path, 'image/png'));

    // OCR
    const tex = await getTexFromHuggingFace(blob);

    console.log("tex", tex);

  };
  // img.onerror = reject;
  img.src = path;
  // });
}