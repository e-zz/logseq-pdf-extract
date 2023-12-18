// wrap tex with customized delimiters and style
// default template in settings:
// ((uuid))\n$$tex$$
export function wrapAreaIdTex(t: string, uuid: string) {

  let texStyle = logseq.settings.area_style;

  if (texStyle) {
    texStyle = texStyle.replace("tex", t);

    if (uuid !== "") {
      texStyle = texStyle.replace("uuid", uuid);
    }
    return texStyle;
  }
  return "$$" + t + "$$"
}