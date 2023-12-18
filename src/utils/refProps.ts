export const refProps = async (propsKeysList?: HTMLElement[]) => {
  // if (!globals.pluginConfig.hideDotProps && !globals.pluginConfig.hideSetOfProps) {
  //   return;
  // }

  if (!propsKeysList) {
    let doc = top.document;
    propsKeysList = [...doc.querySelectorAll('#app-container .block-properties .page-property-key')] as HTMLElement[];
  }
  if (propsKeysList.length) {
    // let refPropsArr: string[] = [];
    // if (globals.pluginConfig.hideSetOfProps) {
    //   refPropsArr = (globals.pluginConfig.hideSetOfProps as string).trim().toLowerCase().replaceAll(' ', '').split(',');
    // }

    let refPropsArr = logseq.settings.prop_name;
    for (let i = 0; i < propsKeysList.length; i++) {
      const propKeyItemText = propsKeysList[i].textContent;
      const propItem = propsKeysList[i].parentElement!.parentElement;
      if (propKeyItemText && propItem) {
        // if (propKeyItemText?.startsWith('.')) {
        // propItem.classList.add('hidden', 'awPr-hideDotProp');
        // } else
        if (propKeyItemText == refPropsArr) {
          propItem.classList.add('ellipsis', 'pdf-extract');
        } else {
          propItem.classList.remove('ellipsis', 'pdf-extract');
        }
      }
    }
  }
  // const visiblePropsKeysList = [... doc.querySelectorAll('#app-container .block-properties')] as HTMLElement[];
};