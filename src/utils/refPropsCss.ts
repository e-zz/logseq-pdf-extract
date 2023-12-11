
// Hide the ellipsis on the block properties
// TODO: make pdf-ref configurable
export const refPropEllipsis = () => {
  logseq.provideStyle(
    `
    #app-container .block-properties .pdf-extract.ellipsis {
      // display: none !important;
      overflow: hidden !important;
      height: 1.5em !important;
    }
    
    a[data-ref="pdf-ref"] {
      font-weight: 400 !important;
      opacity: 0.5 !important;
    }
    `
  );
}