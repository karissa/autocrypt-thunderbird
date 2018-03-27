var getBodyElement = require('./body')
var unicode = require('./unicode')
var escapeTextForHTML = require('./escapeText')
var decrypt = require('./decrypt')
var getCurrentMsgUriSpec = require('./msg-uri')
var formatPlaintextMsg = require('./format')
var unicode = require('./unicode')
var armor = require('./armor')
var Locale = require('./locale')

var Cc = self.Components.classes
var Ci = self.Components.interfaces

function isDosLike () {
  return false;
}

module.exports = parseCallback

function parseCallback (msgText, contentEncoding, charset, messageUrl, signature, retry, head, tail, msgUriSpec) {
  var plainText = decrypt(msgText, signature);
  var newSignature = "";

  let armorHeaders = armor.getArmorHeaders(msgText);
  if ("charset" in armorHeaders) {
    charset = armorHeaders.charset;
  }

  if (plainText === "" && exitCode === 0) {
    plainText = " ";
  }

  statusFlags = statusFlagsObj.value;

  if (err) {
    // Bad signature/armor
    if (retry == 1) {
      msgText = unicode.convertFromUnicode(msgText, "UTF-8");
      parseCallback(msgText, contentEncoding, charset, messageUrl, signature, retry + 1, head, tail, msgUriSpec);
      return;
    }
    else if (retry == 2) {
      msgText = unicode.convertToUnicode(msgText, "UTF-8");
      parseCallback(msgText, contentEncoding, charset, messageUrl, null, retry + 1, head, tail, msgUriSpec);
      return;
    }
  }

  if (retry >= 2) {
    plainText = unicode.convertFromUnicode(unicode.convertToUnicode(plainText, "UTF-8"), charset);
  }

  // Save decrypted message status, headers, and content
  var headerList = {
    "subject": "",
    "from": "",
    "date": "",
    "to": "",
    "cc": ""
  };

  var index, headerName;

  if (!self.gViewAllHeaders) {
    for (index = 0; index < headerList.length; index++) {
      headerList[index] = "";
    }

  }
  else {
    for (index = 0; index < self.gExpandedHeaderList.length; index++) {
      headerList[gExpandedHeaderList[index].name] = "";
    }

    for (headerName in self.currentHeaderData) {
      headerList[headerName] = "";
    }
  }

  for (headerName in headerList) {
    if (self.currentHeaderData[headerName])
    headerList[headerName] = self.currentHeaderData[headerName].headerValue;
  }

  // WORKAROUND
  if (headerList.cc == headerList.to)
  headerList.cc = "";

  var msgRfc822Text = "";
  if (head || tail) {
    if (head) {
      // print a warning if the signed or encrypted part doesn't start
      // quite early in the message
      let matches = head.match(/(\n)/g);
      if (matches && matches.length > 10) {
        msgRfc822Text = unicode.convertFromUnicode(Locale.getString("notePartEncrypted"), charset) + "\n\n";
      }
      msgRfc822Text += head + "\n\n";
    }
    msgRfc822Text += unicode.convertFromUnicode(Locale.getString("beginPgpPart"), charset) + "\n\n";
  }
  msgRfc822Text += plainText;
  if (head || tail) {
    msgRfc822Text += "\n\n" + unicode.convertFromUnicode(Locale.getString("endPgpPart"), charset) + "\n\n" + tail;
  }

  var decryptedMessage = {
    url: messageUrl,
    uri: msgUriSpec,
    headerList: headerList,
    charset: charset,
    plainText: msgRfc822Text
  };

  // don't display decrypted message if message selection has changed
  displayedUriSpec = getCurrentMsgUriSpec();
  if (msgUriSpec && displayedUriSpec && (displayedUriSpec != msgUriSpec)) return;

  // Create and load one-time message URI
  var messageContent = getDecryptedMessage(decryptedMessage, "message/rfc822", false);

  noShowReload = true;
  var node;
  var bodyElement = getBodyElement();

  if (bodyElement.firstChild) {
    node = bodyElement.firstChild;
    var foundIndex = -1;
    var findStr = "-----BEGIN PGP";

    while (node) {
      if (node.nodeName == "DIV") {
        foundIndex = node.textContent.indexOf(findStr);

        if (foundIndex >= 0) {
          if (node.textContent.indexOf(findStr + " LICENSE AUTHORIZATION") == foundIndex)
          foundIndex = -1;
        }
        if (foundIndex >= 0) {
          node.innerHTML = formatPlaintextMsg(unicode.convertToUnicode(messageContent, charset));
          return;
        }
      }
      node = node.nextSibling;
    }

    // if no <DIV> node is found, try with <PRE> (bug 24762)
    node = bodyElement.firstChild;
    foundIndex = -1;
    while (node) {
      if (node.nodeName == "PRE") {
        foundIndex = node.textContent.indexOf(findStr);

        if (foundIndex >= 0) {
          if (node.textContent.indexOf(findStr + " LICENSE AUTHORIZATION") == foundIndex)
          foundIndex = -1;
        }
        if (foundIndex >= 0) {
          node.innerHTML = formatPlaintextMsg(unicode.convertToUnicode(messageContent, charset));
          return;
        }
      }
      node = node.nextSibling;
    }

    // TODO: HACK for MS-EXCHANGE-Server Problem
  }

  console.error("no node found to replace message display\n");

  return;
}

function getDecryptedMessage (decryptedMessage, contentType, includeHeaders) {
  if (!decryptedMessage) return "No decrypted message found!\n";

  var headerList = decryptedMessage.headerList;
  var contentData = "";
  var headerName;

  if (contentType == "message/rfc822") {
    // message/rfc822

    if (includeHeaders) {
      try {

        var msg = self.gFolderDisplay.selectedMessage;
        if (msg) {
          let msgHdr = {
            "From": msg.author,
            "Subject": msg.subject,
            "To": msg.recipients,
            "Cc": msg.ccList,
            "Date": getDateTime(msg.dateInSeconds, true, true)
          };


          if (self.gFolderDisplay.selectedMessageIsNews) {
            if (self.currentHeaderData.newsgroups) {
              msgHdr.Newsgroups = self.currentHeaderData.newsgroups.headerValue;
            }
          }

          for (let headerName in msgHdr) {
            if (msgHdr[headerName] && msgHdr[headerName].length > 0)
            contentData += headerName + ": " + msgHdr[headerName] + "\r\n";
          }

        }
      }
      catch (ex) {
        // the above seems to fail every now and then
        // so, here is the fallback
        for (let headerName in headerList) {
          let headerValue = headerList[headerName];
          contentData += headerName + ": " + headerValue + "\r\n";
        }
      }

      contentData += "Content-Type: text/plain";

      if (decryptedMessage.charset) {
        contentData += "; charset=" + decryptedMessage.charset;
      }

      contentData += "\r\n";
    }

    contentData += "\r\n";

    if (decryptedMessage.hasAttachments && (!decryptedMessage.attachmentsEncrypted)) {
      contentData += unicode.convertFromUnicode(Locale.getString("enigContentNote"), decryptedMessage.charset);
    }

    contentData += decryptedMessage.plainText;
  }
  else {
    // text/html or text/plain

    if (contentType == "text/html") {
      contentData += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=" + decryptedMessage.charset + "\">\r\n";
      contentData += "<html><head></head><body>\r\n";
    }

    if (includeHeaders) {
      for (headerName in headerList) {
        let headerValue = headerList[headerName];

        if (headerValue) {
          if (contentType == "text/html") {
            contentData += "<b>" + escapeTextForHTML(headerName, false) + ":</b> " +
            escapeTextForHTML(headerValue, false) + "<br>\r\n";
          }
          else {
            contentData += headerName + ": " + headerValue + "\r\n";
          }
        }
      }
    }

    if (contentType == "text/html") {
      contentData += "<pre>" + escapeTextForHTML(decryptedMessage.plainText, false) + "</pre>\r\n";
      contentData += "</body></html>\r\n";
    }
    else {
      contentData += "\r\n" + decryptedMessage.plainText;
    }

    var isDosLike = true
    if (!(isDosLike)) {
      contentData = contentData.replace(/\r\n/g, "\n");
    }
  }

  return contentData;
}

/**
* Transform a Unix-Timestamp to a human-readable date/time string
*
* @dateNum:  Number  - Unix timestamp
* @withDate: Boolean - if true, include the date in the output
* @withTime: Boolean - if true, include the time in the output
*
* @return: String - formatted date/time string
*/
function getDateTime (dateNum, withDate, withTime) {
  if (dateNum && dateNum !== 0) {
    let dat = new Date(dateNum * 1000);
    let appLocale = Locale.get();

    var options = {};

    if (withDate) {
      options.day = DATE_2DIGIT;
      options.month = DATE_2DIGIT;
      let year = dat.getFullYear();
      if (year > 2099) {
        options.year = DATE_4DIGIT;
      }
      else {
        options.year = DATE_2DIGIT;
      }
    }
    if (withTime) {
      options.hour = DATE_2DIGIT;
      options.minute = DATE_2DIGIT;
    }

    let useLocale = appLocale.getCategory("NSILOCALE_TIME").substr(0, 5);
    useLocale = useLocale.replace(/_/g, "-");

    try {
      return new Intl.DateTimeFormat(useLocale, options).format(dat);
    }
    catch (ex) {
      return new Intl.DateTimeFormat("en-US", options).format(dat);
    }
  }
  else {
    return "";
  }
}
