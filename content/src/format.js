var Cc = self.Components.classes
var Ci = self.Components.interfaces

module.exports = function (plainTxt) {
  if (!self.gTxtConverter)
    self.gTxtConverter = Cc["@mozilla.org/txttohtmlconv;1"].createInstance(Ci.mozITXTToHTMLConv);

  var fontStyle = "";
  fontStyle = "font-weight: bold; ";
  fontStyle += "font-size: small; ";

  var convFlags = Ci.mozITXTToHTMLConv.kURLs;

  // start processing the message

  plainTxt = plainTxt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  var lines = plainTxt.split(/\n/);
  var oldCiteLevel = 0;
  var citeLevel = 0;
  var preface = "";
  var logLineStart = {
    value: 0
  };
  var isSignature = false;

  for (var i = 0; i < lines.length; i++) {
    preface = "";
    oldCiteLevel = citeLevel;
    if (lines[i].search(/^[> \t]*>$/) === 0)
      lines[i] += " ";

    citeLevel = self.gTxtConverter.citeLevelTXT(lines[i], logLineStart);

    if (citeLevel > oldCiteLevel) {

      preface = '</pre>';
      for (let j = 0; j < citeLevel - oldCiteLevel; j++) {
        preface += '<blockquote type="cite" style="' + fontStyle + '">';
      }
      preface += '<pre wrap="">\n';
    }
    else if (citeLevel < oldCiteLevel) {
      preface = '</pre>';
      for (let j = 0; j < oldCiteLevel - citeLevel; j++)
        preface += "</blockquote>";

      preface += '<pre wrap="">\n';
    }

    if (logLineStart.value > 0) {
      preface += '<span class="moz-txt-citetags">' +
        gTxtConverter.scanTXT(lines[i].substr(0, logLineStart.value), convFlags) +
        '</span>';
    }
    else if (lines[i] == "-- ") {
      preface += '<div class="moz-txt-sig">';
      isSignature = true;
    }
    lines[i] = preface + self.gTxtConverter.scanTXT(lines[i].substr(logLineStart.value), convFlags);

  }

  var r = '<pre wrap="">' + lines.join("\n") + (isSignature ? '</div>' : '') + '</pre>';
  return r;
}
