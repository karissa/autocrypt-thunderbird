
module.exports = {
  convertToUnicode, convertFromUnicode
}
function converter (charset) {
  let unicodeConv = Cc[SCRIPTABLEUNICODECONVERTER_CONTRACTID].getService(Ci.nsIScriptableUnicodeConverter);
  unicodeConv.charset = charset || "utf-8";
  return unicodeConv;
}

function convertToUnicode (text, charset) {
  if (!text || (charset && (charset.toLowerCase() == "iso-8859-1"))) {
    return text;
  }

  // Encode plaintext
  try {
    return converter(charset).ConvertToUnicode(text);
  }
  catch (ex) {
    return text;
  }
}

function convertFromUnicode (text, charset) {
  if (!text) {
    return "";
  }

  try {
    return converter(charset).ConvertFromUnicode(text);
  }
  catch (ex) {
    return text;
  }
}
