var parseCallback = require('./parseCallback')
var getCurrentMsgUriSpec = require('./msg-uri')
var unicode = require('./unicode')

const Cc = self.Components.classes
const Ci = self.Components.interfaces


module.exports = function messageParse (savedHeaders, opts) {
  if (!opts) opts = {}
  var contentType = savedHeaders["content-type"];
  var contentEncoding = savedHeaders["content-transfer-encoding"];
  var bodyElement = getBodyElement();
  var msgUriSpec = getCurrentMsgUriSpec()

  if (!bodyElement) return;

  let topElement = bodyElement;
  var findStr = /* interactive ? null : */ "-----BEGIN PGP";
  var msgText = null;
  var foundIndex = -1;

  if (bodyElement.firstChild) {
    let node = bodyElement.firstChild;
    while (node) {
      if (node.nodeName == "DIV") {
        foundIndex = node.textContent.indexOf(findStr);

        if (foundIndex >= 0) {
          if (node.textContent.indexOf(findStr + " LICENSE AUTHORIZATION") == foundIndex)
          foundIndex = -1;
        }
        if (foundIndex >= 0) {
          bodyElement = node;
          break;
        }
      }
      node = node.nextSibling;
    }
  }

    if (foundIndex >= 0) {
      if (savedHeaders["content-type"].search(/^text\/html/i) === 0) {
        let p = Cc["@mozilla.org/parserutils;1"].createInstance(Ci.nsIParserUtils);
        const de = Ci.nsIDocumentEncoder;
        msgText = p.convertToPlainText(topElement.innerHTML, de.OutputRaw | de.OutputBodyOnly, 0);
      }
      else {
        msgText = bodyElement.textContent;
      }
    }

    if (!msgText) {
      // No PGP content

      // but this might be caused by the HACK for MS-EXCHANGE-Server Problem
      // - so return only if:
      if (!opts.buggyExchangeEmailContent || opts.buggyExchangeEmailContent == "???") {
        return;
      }

      console.error("messageParse: got buggyExchangeEmailContent = " + opts.buggyExchangeEmailContent.substr(0, 50) + "\n");

      msgText = opts.buggyExchangeEmailContent;

      msgText = msgText.replace(/\r\n/g, "\n");
      msgText = msgText.replace(/\r/g, "\n");

      // content is in encrypted.asc part:
      let idx = msgText.search(/Content-Type: application\/octet-stream; name="encrypted.asc"/i);
      if (idx >= 0) {
        msgText = msgText.slice(idx);
      }
      // check whether we have base64 encoding
      var isBase64 = false;
      idx = msgText.search(/Content-Transfer-Encoding: base64/i);
      if (idx >= 0) {
        isBase64 = true;
      }
      // find content behind part header
      idx = msgText.search(/\n\n/);
      if (idx >= 0) {
        msgText = msgText.slice(idx);
      }
      // remove stuff behind content block (usually a final boundary row)
      idx = msgText.search(/\n\n--/);
      if (idx >= 0) {
        msgText = msgText.slice(0, idx + 1);
      }
      // decode base64 if it is encoded that way
      if (isBase64) {
        try {
          msgText = decodeBase64(msgText);
        }
        catch (ex) {
          console.error("messageParse.js: decodeBase64() ", ex);
        }
        //EnigmailLog.DEBUG("nach base64 decode: \n" + msgText + "\n");
      }
    }

    var charset = msgWindow ? msgWindow.mailCharacterSet : "";

    // Encode ciphertext to charset from unicode
    msgText = unicode.convertFromUnicode(msgText, charset);

    var mozPlainText = bodyElement.innerHTML.search(/class="moz-text-plain"/);

    if ((mozPlainText >= 0) && (mozPlainText < 40)) {
      // workaround for too much expanded emoticons in plaintext msg
      var r = new RegExp(/( )(;-\)|:-\)|;\)|:\)|:-\(|:\(|:-\\|:-P|:-D|:-\[|:-\*|>:o|8-\)|:-\$|:-X|=-O|:-!|O:-\)|:'\()( )/g);
      if (msgText.search(r) >= 0) {
        console.error("messageParse: performing emoticons fixing\n");
        msgText = msgText.replace(r, "$2");
      }
    }

    // extract text preceeding and/or following armored block
    var head = "";
    var tail = "";
    if (findStr) {
      head = msgText.substring(0, msgText.indexOf(findStr)).replace(/^[\n\r\s]*/, "");
      head = head.replace(/[\n\r\s]*$/, "");
      var endStart = msgText.indexOf("-----END PGP");
      var nextLine = msgText.substring(endStart).search(/[\n\r]/);
      if (nextLine > 0) {
        tail = msgText.substring(endStart + nextLine).replace(/^[\n\r\s]*/, "");
      }
    }

    //EnigmailLog.DEBUG("enigmailMessengerOverlay.js: msgText='"+msgText+"'\n");

    var mailNewsUrl = getUrlFromUriSpec(msgUriSpec);
    var urlSpec = mailNewsUrl ? mailNewsUrl.spec : "";
    let retry = (charset != "UTF-8" ? 1 : 2);

    parseCallback(msgText, contentEncoding, charset, urlSpec, "", retry, head, tail, msgUriSpec);
  },

  function displayBuggyExchangeMail (buggyMailType, buggyExchangeEmailContent) {
    let hdrs = Cc["mozilla.org/messenger/mimeheaders;1"].createInstance(Components.interfaces.nsIMimeHeaders);
    hdrs.initialize(opts.buggyExchangeEmailContent);
    let ct = hdrs.extractHeader("content-type", true);

    if (ct && ct.search(/^text\/plain/i) === 0) {
      let bi = buggyExchangeEmailContent.search(/\r?\n/);
      let boundary = buggyExchangeEmailContent.substr(2, bi - 2);
      let startMsg = buggyExchangeEmailContent.search(/\r?\n\r?\n/);
      let msgText;

      if (buggyMailType == "exchange") {
        msgText = 'Content-Type: multipart/encrypted; protocol="application/pgp-encrypted"; boundary="' + boundary + '"\r\n' +
          buggyExchangeEmailContent.substr(startMsg);
      }
      else {
        msgText = 'Content-Type: multipart/encrypted; protocol="application/pgp-encrypted"; boundary="' + boundary + '"\r\n' +
          "\r\n" + boundary + "\r\n" +
          "Content-Type: application/pgp-encrypted\r\n" +
          "Content-Description: PGP/MIME version identification\r\n\r\n" +
          "Version: 1\r\n\r\n" +
          this.buggyExchangeEmailContent.substr(startMsg).replace(/^Content-Type: +application\/pgp-encrypted/im,
            "Content-Type: application/octet-stream");

      }

      // TODO: LOAD BUGGY MAIL!
      //messenger.loadURL(window, uri);

      // Thunderbird
      let atv = document.getElementById("attachmentView");
      if (atv) {
        atv.setAttribute("collapsed", "true");
      }

      // SeaMonkey
      let eab = document.getElementById("expandedAttachmentBox");
      if (eab) {
        eab.setAttribute("collapsed", "true");
      }

      return true;
    }

    return false;
  }

  function getUrlFromUriSpec (uriSpec) {
    try {
      if (!uriSpec)
        return null;

      let messenger = Cc["@mozilla.org/messenger;1"].getService(Ci.nsIMessenger);
      let msgService = messenger.messageServiceFromURI(uriSpec);

      let urlObj = {};
      msgService.GetUrlForUri(uriSpec, urlObj, null);

      let url = urlObj.value;

      if (url.scheme == "file") {
        return url;
      }
      else {
        return url.QueryInterface(Ci.nsIMsgMailNewsUrl);
      }

    }
    catch (ex) {
      return null;
    }
  }
