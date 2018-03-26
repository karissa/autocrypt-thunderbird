var getBodyElement = require('./body')
var getDecryptedMessage = require('./decrypt')
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
  var plainText;
  var exitCode;
  var newSignature = "";
  var statusFlags = 0;

  var errorMsgObj = {
    value: ""
  };
  var keyIdObj = {};
  var userIdObj = {};
  var sigDetailsObj = {};
  var encToDetailsObj = {};
  var pEpResult = null;

  var blockSeparationObj = {
    value: ""
  };

  let armorHeaders = armor.getArmorHeaders(msgText);
  if ("charset" in armorHeaders) {
    charset = armorHeaders.charset;
  }

  var exitCodeObj = {};
  var statusFlagsObj = {};
  var signatureObj = {};
  signatureObj.value = signature;

  plainText = decryptMessage(window, uiFlags, msgText,
    signatureObj, exitCodeObj, statusFlagsObj,
    keyIdObj, userIdObj, sigDetailsObj,
    errorMsgObj, blockSeparationObj, encToDetailsObj);

  //EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageParseCallback: plainText='"+plainText+"'\n");

  exitCode = exitCodeObj.value;
  newSignature = signatureObj.value;

  if (plainText === "" && exitCode === 0) {
    plainText = " ";
  }

  statusFlags = statusFlagsObj.value;

  if ((exitCode !== 0) && (!(statusFlags & noSecondTry))) {
    // Bad signature/armor
    if (retry == 1) {
      msgText = unicode.convertFromUnicode(msgText, "UTF-8");
          parseCallback(msgText, contentEncoding, charset, messageUrl, signature, retry + 1, head, tail, msgUriSpec);
        return;
      }
      else if (retry == 2) {
        // Try to verify signature by accessing raw message text directly
        // (avoid recursion by setting retry parameter to false on callback)
        newSignature = "";
        msgDirectDecrypt(contentEncoding, charset, newSignature, 0, head, tail, msgUriSpec, parseCallback);
        return;
      }
      else if (retry == 3) {
        msgText = unicode.convertToUnicode(msgText, "UTF-8");
        parseCallback(msgText, contentEncoding, charset, messageUrl, null, retry + 1, head, tail, msgUriSpec);
        return;
      }
    }

    if (retry >= 2) {
      plainText = unicode.convertFromUnicode(unicode.convertToUnicode(plainText, "UTF-8"), charset);
    }

    if (blockSeparationObj.value.indexOf(" ") >= 0) {
      var blocks = blockSeparationObj.value.split(/ /);
      var blockInfo = blocks[0].split(/:/);
      plainText = unicode.convertFromUnicode(Locale.getString("notePartEncrypted"), charset) +
        "\n\n" + plainText.substr(0, blockInfo[1]) + "\n\n" + Locale.getString("noteCutMessage");
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

    if (!gViewAllHeaders) {
      for (index = 0; index < headerList.length; index++) {
        headerList[index] = "";
      }

    }
    else {
      for (index = 0; index < gExpandedHeaderList.length; index++) {
        headerList[gExpandedHeaderList[index].name] = "";
      }

      for (headerName in currentHeaderData) {
        headerList[headerName] = "";
      }
    }

    for (headerName in headerList) {
      if (currentHeaderData[headerName])
        headerList[headerName] = currentHeaderData[headerName].headerValue;
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
