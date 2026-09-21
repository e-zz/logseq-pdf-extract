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