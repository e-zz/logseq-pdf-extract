// import { doc, globals } from '../globals/globals';
// import { refreshUserIconsListCSS } from '../propsIcons/propsIcons';
import { refProps } from './refProps';

let doc = top.document;
let propsChangedObserverConfig: MutationObserverInit;
let propsChangedObserver: MutationObserver;

export const ObserverInit = () => {
  propsChangedObserverConfig = {
    childList: true,
    subtree: true,
  };
  propsChangedObserver = new MutationObserver(propsChangedCallback);
};

const propsChangedCallback: MutationCallback = async function (mutationsList) {
  for (let i = 0; i < mutationsList.length; i++) {
    const mutationItem = mutationsList[i];
    const addedNode = mutationItem.addedNodes[0] as HTMLElement;
    if (addedNode && addedNode.childNodes.length) {
      // 
      const propsKeysList = [...addedNode.querySelectorAll('.block-properties .page-property-key')] as HTMLElement[];
      if (propsKeysList.length) {
        // TODO check if only the first added node is processed
        refProps(propsKeysList);
        // const currentPage = await logseq.Editor.getCurrentPage();
        // const iconsSetPageName = (globals.pluginConfig.iconsPropsPage as string).toLowerCase();
        // if (currentPage && currentPage.name === iconsSetPageName) {
        //   refreshUserIconsListCSS();
        // }
      }
    }
  }
};

export const propsChangedObserverRun = () => {
  propsChangedObserver.observe(doc.getElementById('app-container') as Element, propsChangedObserverConfig);
};

export const propsChangedObserverStop = () => {
  propsChangedObserver.disconnect();
};