// import { doc, globals } from '../globals/globals';

import { propsChangedObserverInit, propsChangedObserverRun, propsChangedObserverStop } from './propsObserver';

import { refPropEllipsis } from './refPropsCss';

const __debug = false;

export const changePropsLoad = async () => {
  refPropEllipsis();
  refProps();
  propsChangedObserverInit();
  propsChangedObserverRun();
  // Route listener
  logseq.App.onRouteChanged(() => {
    propsChangedObserverStop();
    setTimeout(() => {
      refProps();
      propsChangedObserverRun();
    }, 100);
  });
}

/*
export const refProps Unload = () => {
  hideDotPropsUnload();
  hideSetOfPropsUnload();
}

export const toggleHideDotProps = () => {
  if (globals.pluginConfig.hideDotProps) {
    refProps();
  } else {
    hideDotPropsUnload();
  }
}

export const toggleHideSetOfProps = () => {
  if (globals.pluginConfig.hideSetOfProps) {
    refProps();
  } else {
    hideSetOfPropsUnload();
  }
}

const hideDotPropsUnload = () => {
  const dotPropList = doc.querySelectorAll('.awPr-hideDotProp');
  if (dotPropList.length) {
    for (let i = 0; i < dotPropList.length; i++) {
      const dotProp = dotPropList[i];
      dotProp.classList.remove('hidden', 'awPr-hideDotProp');
    }
  }
}

const hideSetOfPropsUnload = () => {
  const setOfPropsList = doc.querySelectorAll('.awPr-hideSetOfProps');
  if (setOfPropsList.length) {
    for (let i = 0; i < setOfPropsList.length; i++) {
      const setOfPropsItem = setOfPropsList[i];
      setOfPropsItem.classList.remove('hidden', 'awPr-hideSetOfProps');
    }
  }
}
*/

export const refProps = async (propsKeysList?: HTMLElement[]) => {
  // if (!globals.pluginConfig.hideDotProps && !globals.pluginConfig.hideSetOfProps) {
  //   return;
  // }

  let doc = top.document;
  if (!propsKeysList) {
    propsKeysList = [...doc.querySelectorAll('#app-container .block-properties .page-property-key')] as HTMLElement[];
  }
  if (propsKeysList.length) {
    // let refPropsArr: string[] = [];
    // if (globals.pluginConfig.hideSetOfProps) {
    //   refPropsArr = (globals.pluginConfig.hideSetOfProps as string).trim().toLowerCase().replaceAll(' ', '').split(',');
    // }
    console.log("invoked refProps");

    let refPropsArr = "pdf-ref"
    for (let i = 0; i < propsKeysList.length; i++) {
      const propKeyItemText = propsKeysList[i].textContent;
      const propItem = propsKeysList[i].parentElement!.parentElement;
      if (propKeyItemText && propItem) {
        // if (propKeyItemText?.startsWith('.')) {
        // propItem.classList.add('hidden', 'awPr-hideDotProp');
        // } else
        if (propKeyItemText == refPropsArr) {
          if (__debug) {
            console.log(propItem);
          }
          propItem.classList.add('ellipsis', 'pdf-extract');
        } else {
          propItem.classList.remove('ellipsis', 'pdf-extract');
        }
      }
    }
  }
  // const visiblePropsKeysList = [... doc.querySelectorAll('#app-container .block-properties')] as HTMLElement[];
};