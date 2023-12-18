import { addOCRButtonInPage } from "./addOcrButton";
let doc = top.document;
let areaChangedObserverConfig: MutationObserverInit;
let areaChangedObserver: MutationObserver;

export const areaObserverInit = () => {
  areaChangedObserverConfig = {
    childList: true,
    subtree: true,
  };
  areaChangedObserver = new MutationObserver(areaChangedCallback);
};

const areaChangedCallback: MutationCallback = async function (mutationsList) {
  for (let i = 0; i < mutationsList.length; i++) {
    const addedNode = mutationsList[i].addedNodes[0] as HTMLElement;
    if (addedNode && addedNode.childNodes.length) {
      // 
      const areaHighlightList = Array.from(addedNode.querySelectorAll('span.hl-area span.actions')) as HTMLElement[];
      if (areaHighlightList.length) {
        addOCRButtonInPage(areaHighlightList);
      }
    }
  }
};

export const areaChangedObserverRun = () => {
  areaChangedObserver.observe(doc.getElementById('app-container') as Element, areaChangedObserverConfig);
};

export const areaChangedObserverStop = () => {
  areaChangedObserver.disconnect();
};