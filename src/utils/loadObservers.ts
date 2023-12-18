
import { areaObserverInit, areaChangedObserverRun, areaChangedObserverStop } from "./ocrObserver";
import { addOCRButtonInPage } from "./addOcrButton";
export async function injectAreaHL() {

  addOCRButtonInPage();
  areaObserverInit();
  areaChangedObserverRun();

  logseq.App.onRouteChanged(() => {
    areaChangedObserverStop();
    setTimeout(() => {
      addOCRButtonInPage();
      areaChangedObserverRun();
    }, 100);
  });
}

import { ObserverInit, propsChangedObserverRun, propsChangedObserverStop } from './propsObserver';

import { refPropEllipsis } from './refPropsCss';
import { refProps } from './refProps';


export const changePropsLoad = async () => {
  if (logseq.settings.prop_name) {

    refPropEllipsis();
    refProps();
    ObserverInit();
    propsChangedObserverRun();

    logseq.App.onRouteChanged(() => {
      propsChangedObserverStop();
      setTimeout(() => {
        refProps();
        propsChangedObserverRun();
      }, 100);
    });

  }
}
