var autocrypt = require('./autocrypt')

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
    if (autocryptHeader) importAutocryptHeader(autocryptHeader)
  }
}

function importAutocryptHeader (autocryptHeader) {
  ac
}

function load () {
  self.gMessageListeners.push(messageListener);
}

function unload () {
  for (let i = 0; i < self.gMessageListeners.length; i++) {
    if (self.gMessageListeners[i] === messageListener) {
      self.gMessageListeners.splice(i, 1);
      break;
    }
  }
}

window.addEventListener("load", load);
window.addEventListener("unload", unload);
