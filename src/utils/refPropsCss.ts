
// Hide the ellipsis on the block properties
export const refPropEllipsis = () => {
  logseq.provideStyle(
    `
    #app-container .block-properties .pdf-extract.ellipsis {
      // display: none !important;
      overflow: hidden !important;
      height: 1.5em !important;
    }
    `
  );
}