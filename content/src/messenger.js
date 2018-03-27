var parseAuthor = require('parse-author')
var autocrypt = require('./autocrypt')()
var parseMime = require('./parseMime')

var messagePane = document.getElementById('messagepane');

var messageListener = {
  onStartHeaders: function() {
    if ("autocrypt" in self.gExpandedHeaderView) {
      delete self.gExpandedHeaderView.autocrypt;
    }
  },
  onEndHeaders: function() {},
  onEndAttachments: function() {},
  onBeforeShowHeaderPane: function () {
    for (let h in self.currentHeaderData) {
      if (/^autocrypt\d*$/i.test(h)) {
        autocryptHeader = self.currentHeaderData[h].headerValue
      }
    }
    if (!autocryptHeader) return parseMime()
    var from = parseAuthor(self.currentHeaderData.from.headerValue).email
    var date = new Date(self.currentHeaderData.date.headerValue)
    autocrypt.processAutocryptHeader(autocryptHeader, from, date, function (err) {
      if (err) console.error(err)
      else parseMime()
    })
  }
}


function messageFrameUnload () {
  console.log('cleaning up!')
}

function load () {
  self.gMessageListeners.push(messageListener);
  messagePane.addEventListener("unload", messageFrameUnload, true);
}

function unload () {
  for (let i = 0; i < self.gMessageListeners.length; i++) {
    if (self.gMessageListeners[i] === messageListener) {
      self.gMessageListeners.splice(i, 1);
      break;
    }
  }
  messagePane.removeEventListener("unload", messageFrameUnload, true);
}

window.addEventListener("load", load);
window.addEventListener("unload", unload);
