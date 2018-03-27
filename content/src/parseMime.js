var messageParse = require('./messageParse')

var HEADERS_LIST = ["content-transfer-encoding", "x-enigmail-version", "x-pgp-encoding-format", "autocrypt-setup-message"]

function enumerateMimeParts (mimePart, resultObj) {
  try {
    var ct = mimePart.fullContentType;
    if (typeof(ct) == "string") {
      ct = ct.replace(/[\r\n]/g, " ");
      if (ct.search(/multipart\/signed.*application\/pgp-signature/i) >= 0) {
        resultObj.signed.push(mimePart.partNum);
      }
      else if (ct.search(/application\/pgp-encrypted/i) >= 0)
      resultObj.encrypted.push(mimePart.partNum);
    }
  }
  catch (ex) {
    // catch exception if no headers or no content-type defined.
  }

  var i;
  for (i in mimePart.subParts) {
    enumerateMimeParts(mimePart.subParts[i], resultObj);
  }
}

module.exports = parseMime

function parseMime (event, mimeMsg) {
    var buggyExchangeEmailContent = null; // reinit HACK for MS-EXCHANGE-Server Problem
    var mimeParts;
    let enigmailSvc;
    let contentType = "";
    try {

      if (!mimeMsg) {
        try {
          contentType = self.currentHeaderData['content-type'].headerValue;
        }
        catch (ex) {
          contentType = "text/plain";
        }
        mimeMsg = {
          partNum: "1",
          headers: {
            has: function() {
              return false;
            },
            contentType: {
              type: contentType,
              mediatype: "",
              subtype: ""
            }
          },
          fullContentType: contentType,
          body: "",
          parent: null,
          subParts: []
        };
      }

      // Copy selected headers
      var savedHeaders = {
        autocrypt: []
      };

      for (let h in currentHeaderData) {
        if (h.search(/^autocrypt\d*$/) === 0) {
          savedHeaders.autocrypt.push(currentHeaderData[h].headerValue);
        }
      }

      if (!mimeMsg.fullContentType) {
        mimeMsg.fullContentType = "text/plain";
      }

      savedHeaders["content-type"] = mimeMsg.fullContentType;
      mimeParts = mimeMsg;

      for (var index = 0; index < HEADERS_LIST.length; index++) {
        var headerName = HEADERS_LIST[index];
        var headerValue = "";

        if (mimeMsg.headers.has(headerName)) {
          let h = mimeMsg.headers.get(headerName);
          if (Array.isArray(h)) {
            headerValue = h.join("");
          }
          else
            headerValue = h;
        }
        savedHeaders[headerName] = headerValue;
      }

      var msgSigned = null;
      var msgEncrypted = null;
      var resultObj = {
        encrypted: [],
        signed: []
      };

      if (mimeMsg.subParts.length > 0) {
        enumerateMimeParts(mimeMsg, resultObj);

        msgSigned = resultObj.signed.length > 0;
        msgEncrypted = resultObj.encrypted.length > 0;

        if ("autocrypt-setup-message" in savedHeaders && savedHeaders["autocrypt-setup-message"].toLowerCase() === "v1") {
          if (currentAttachments[0].contentType.search(/^application\/autocrypt-setup$/i) === 0) {
            console.error('TODO: display autocrypt setup message header')
            return;
          }
        }

        // HACK for Zimbra OpenPGP Zimlet
        // Zimbra illegally changes attachment content-type to application/pgp-encrypted which interfers with below
        // see https://sourceforge.net/p/enigmail/bugs/600/

        try {

          if (mimeMsg.subParts.length > 1 &&
            mimeMsg.headers.has("x-mailer") && mimeMsg.headers.get("x-mailer")[0].indexOf("ZimbraWebClient") >= 0 &&
            mimeMsg.subParts[0].fullContentType.indexOf("text/plain") >= 0 &&
            mimeMsg.fullContentType.indexOf("multipart/mixed") >= 0 &&
            mimeMsg.subParts[1].fullContentType.indexOf("application/pgp-encrypted") >= 0) {
              messageParse(savedHeaders);
              return;
          }
        }
        catch (ex) {}


        // HACK for MS-EXCHANGE-Server Problem:
        // check for possible bad mime structure due to buggy exchange server:
        // - multipart/mixed Container with
        //   - application/pgp-encrypted Attachment with name "PGPMIME Versions Identification"
        //   - application/octet-stream Attachment with name "encrypted.asc" having the encrypted content in base64
        // - see:
        //   - http://www.mozilla-enigmail.org/forum/viewtopic.php?f=4&t=425
        //   - http://sourceforge.net/p/enigmail/forum/support/thread/4add2b69/

        // iPGMail produces a similar broken structure, see here:
        //   - https://sourceforge.net/p/enigmail/forum/support/thread/afc9c246/#5de7

        if (mimeMsg.subParts.length == 3 &&
          mimeMsg.fullContentType.search(/multipart\/mixed/i) >= 0 &&
          mimeMsg.subParts[0].fullContentType.search(/multipart\/encrypted/i) < 0 &&
          mimeMsg.subParts[0].fullContentType.search(/text\/(plain|html)/i) >= 0 &&
          mimeMsg.subParts[1].fullContentType.search(/application\/pgp-encrypted/i) >= 0) {
          if (mimeMsg.subParts[1].fullContentType.search(/multipart\/encrypted/i) < 0 &&
            mimeMsg.subParts[1].fullContentType.search(/PGP\/?MIME Versions? Identification/i) >= 0 &&
            mimeMsg.subParts[2].fullContentType.search(/application\/octet-stream/i) >= 0 &&
            mimeMsg.subParts[2].fullContentType.search(/encrypted.asc/i) >= 0) {
            buggyMailType = "exchange";
          }
          else {
            buggyMailType = "iPGMail";
          }

          // signal that the structure matches to save the content later on
          buggyExchangeEmailContent = "???";

          return messageParse(savedHeaders, {buggyMailType, buggyExchangeEmailContent})
        }
      }

      var contentEncoding = "";
      var xEnigmailVersion = "";
      var msgUriSpec = getCurrentMsgUriSpec();
      var encrypedMsg;

      if (savedHeaders) {
        contentType = savedHeaders["content-type"];
        contentEncoding = savedHeaders["content-transfer-encoding"];
        xEnigmailVersion = savedHeaders["x-enigmail-version"];
      }

      let smime = (contentType.search(/multipart\/signed; protocol="application\/pkcs7-signature/i) >= 0);
      if (!smime && (msgSigned || msgEncrypted)) {
        // PGP/MIME messages
        console.error('not handling this PGP/MIME message')
        return;
      }

      // inline-PGP messages
      messageParse(savedHeaders);
    }
    catch (ex) {
      console.error("decryptcb", ex);
    }
  }
