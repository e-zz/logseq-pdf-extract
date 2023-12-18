import { readOcr, updateOcr } from './ocrLib';

// Function to create a button
function createButton() {
  let button = document.createElement('button');
  button.title = " Copy as TeX";
  button.tabIndex = -1;
  button.className = "asset-action-btn px-1";

  let span = document.createElement('span');
  span.className = "ui__icon ti ls-icon-maximize";
  span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><defs><style>.cls-1{fill-opacity: 0;}.cls-2{fill:var(--ls-link-ref-text-color);}</style></defs><rect class="cls-1" width="24" height="24"/><path class="cls-2" d="M9,7.1H2.33L2.14,9.56H2.4c.15-1.77.32-2.14,2-2.14a3.39,3.39,0,0,1,.59,0c.23,0,.23.16.23.41v5.77c0,.37,0,.53-1.15.53H3.61v.34c.45,0,1.56,0,2.06,0s1.64,0,2.09,0v-.34H7.32c-1.15,0-1.15-.16-1.15-.53V7.86c0-.22,0-.37.19-.41a3.9,3.9,0,0,1,.63,0c1.65,0,1.81.37,2,2.14h.27L9,7.1Z"/><path class="cls-2" d="M14.91,14.15h-.27c-.28,1.68-.53,2.48-2.41,2.48H10.78c-.52,0-.54-.08-.54-.44V13.27h1c1.06,0,1.19.35,1.19,1.28h.27v-2.9h-.27c0,.94-.13,1.28-1.19,1.28h-1V10.3c0-.36,0-.44.54-.44h1.41c1.68,0,2,.61,2.14,2.13h.27l-.3-2.46H8.14v.33H8.4c.84,0,.86.12.86.52v5.73c0,.4,0,.52-.86.52H8.14V17h6.31Z"/><path class="cls-2" d="M18.22,10.27l1.5-2.2a1.67,1.67,0,0,1,1.58-.71V7H18.69v.33c.44,0,.68.25.68.5a.37.37,0,0,1-.1.26L18,10,16.61,7.85a.46.46,0,0,1-.07-.16c0-.13.24-.32.7-.33V7c-.37,0-1.18,0-1.59,0s-1,0-1.43,0v.33h.21c.6,0,.81.08,1,.38l2,3-1.79,2.64a1.67,1.67,0,0,1-1.58.73v.34H16.7v-.34c-.5,0-.69-.31-.69-.51s0-.14.11-.26l1.55-2.3,1.73,2.62s.06.09.06.12-.24.32-.72.33v.34c.39,0,1.19,0,1.6,0s1,0,1.42,0v-.34h-.2c-.58,0-.81-.06-1-.4l-2.3-3.49Z"/></svg>`;

  button.appendChild(span);
  return button;
}

// Function for mousedown event: prevent open-block-ref  
function handleMouseDown(e) {
  e.stopImmediatePropagation();
}

// Function for click event: copy tex to clipboard
async function handleClick(e) {
  e.stopImmediatePropagation();

  const divWrapper = e.target.closest("div[data-type='annotation']");
  let uuid = divWrapper?.getAttribute("blockid");

  let tex = await readOcr(uuid);

  if (!tex) {
    tex = await updateOcr(uuid);
  }
  window.focus();
  await navigator.clipboard.writeText(tex);
}
export async function addOCRButtonInPage(mutationItems?: HTMLElement[]) {
  // add OCR button to area highlight elements in each mutationItem or to all area highlight elements in the current page
  if (!mutationItems) {
    let doc = top.document;
    mutationItems = Array.from(doc.querySelectorAll('#app-container .hl-area .actions'));
  }

  for (let i = 0; i < mutationItems.length; i++) {
    let actions = mutationItems[i];
    if (actions.querySelector('button[title="TeX-OCR"]')) {
      continue;
    }

    let button = createButton();
    button.addEventListener('mousedown', handleMouseDown);
    button.addEventListener('click', handleClick);

    actions.appendChild(button);
  }

}

