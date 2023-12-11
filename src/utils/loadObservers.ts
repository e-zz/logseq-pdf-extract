
import { areaObserverInit, areaChangedObserverRun, areaChangedObserverStop } from "./ocrObserver";
import { addOCRButton } from "./areaHL";
export async function injectAreaHL() {

  addOCRButton();
  areaObserverInit();
  areaChangedObserverRun();

  logseq.App.onRouteChanged(() => {
    areaChangedObserverStop();
    setTimeout(() => {
      addOCRButton();
      areaChangedObserverRun();
    }, 100);
  });
}

import { ObserverInit, propsChangedObserverRun, propsChangedObserverStop } from './propsObserver';

import { refPropEllipsis } from './refPropsCss';
import { refProps } from './refProps';

const __debug = false;

export const changePropsLoad = async () => {
  refPropEllipsis();
  refProps();
  ObserverInit();
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
