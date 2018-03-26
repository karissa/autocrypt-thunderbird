/* global gMessageListeners: false, global gExpandedHeaderView */
var messageListener = {
  onStartHeaders: function() {
    if ("autocrypt" in gExpandedHeaderView) {
      delete gExpandedHeaderView.autocrypt;
    }
    if ("openpgp" in gExpandedHeaderView) {
      delete gExpandedHeaderView.openpgp;
    }
  },
  onEndHeaders: function() {},
  onEndAttachments: function() {}
  }

function load () {
  gMessageListeners.push(messageListener);
}

function unload () {
  for (let i = 0; i < gMessageListeners.length; i++) {
    if (gMessageListeners[i] === messageListener) {
      gMessageListeners.splice(i, 1);
      break;
    }
  }
}

window.addEventListener("load", load, false);
window.addEventListener("unload", unload, false);
