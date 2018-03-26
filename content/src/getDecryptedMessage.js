var unicode = require('./unicode')
var locale = require('./locale')
var escapeTextForHTML = require('./escapeText')

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
    let appLocale = locale.get();

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

module.exports = function getDecryptedMessage (decryptedMessage, contentType, includeHeaders) {
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
        contentData += unicode.convertFromUnicode(locale.getString("enigContentNote"), decryptedMessage.charset);
      }

      contentData += decryptedMessage.plainText;
    }
    else {
      // text/html or text/plain

      if (contentType == "text/html") {
        contentData += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=" + decryptedMessage.charset + "\">\r\n";
        contentData += "<html><head></head><body>\r\n";
      }

      if (statusLine) {
        if (contentType == "text/html") {
          contentData += "<b>" + locale.getString("enigHeader") + "</b> " +
            escapeTextForHTML(statusLine, false) + "<br>\r\n<hr>\r\n";
        }
        else {
          contentData += locale.getString("enigHeader") + " " + statusLine + "\r\n\r\n";
        }
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
  },
