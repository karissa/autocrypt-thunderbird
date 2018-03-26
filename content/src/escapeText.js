// Escape special characters
module.exports = function escapeTextForHTML (text, hyperlink) {
  if (text.indexOf("&") > -1)
  text = text.replace(/&/g, "&amp;");

  if (text.indexOf("<") > -1)
  text = text.replace(/</g, "&lt;");

  if (text.indexOf(">") > -1)
  text = text.replace(/>/g, "&gt;");

  if (text.indexOf("\"") > -1)
  text = text.replace(/"/g, "&quot;");

  if (!hyperlink)
  return text;

  // Hyperlink email addresses (we accept at most 1024 characters before and after the @)
  var addrs = text.match(/\b[A-Za-z0-9_+.-]{1,1024}@[A-Za-z0-9.-]{1,1024}\b/g);

  var newText, offset, loc;
  if (addrs && addrs.length) {
    newText = "";
    offset = 0;

    for (var j = 0; j < addrs.length; j++) {
      var addr = addrs[j];

      loc = text.indexOf(addr, offset);
      if (loc < offset)
      break;

      if (loc > offset)
      newText += text.substr(offset, loc - offset);

      // Strip any period off the end of address
      addr = addr.replace(/[.]$/, "");

      if (!addr.length)
      continue;

      newText += "<a href=\"mailto:" + addr + "\">" + addr + "</a>";

      offset = loc + addr.length;
    }

    newText += text.substr(offset, text.length - offset);

    text = newText;
  }

  // Hyperlink URLs (we don't accept URLS or more than 1024 characters length)
  var urls = text.match(/\b(http|https|ftp):\S{1,1024}\s/g);

  if (urls && urls.length) {
    newText = "";
    offset = 0;

    for (var k = 0; k < urls.length; k++) {
      var url = urls[k];

      loc = text.indexOf(url, offset);
      if (loc < offset)
      break;

      if (loc > offset)
      newText += text.substr(offset, loc - offset);

      // Strip delimiters off the end of URL
      url = url.replace(/\s$/, "");
      url = url.replace(/([),.']|&gt;|&quot;)$/, "");

      if (!url.length)
      continue;

      newText += "<a href=\"" + url + "\">" + url + "</a>";

      offset = loc + url.length;
    }

    newText += text.substr(offset, text.length - offset);

    text = newText;
  }

  return text;
}
