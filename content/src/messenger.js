/* global getCurrentIdentity: false */

var getAuthor = require('./author')
var getMimeTree = require('./mime')
var streams = require('./streams')
var base64 = require('base64-js')
var autocrypt = require('./autocrypt')()
var openpgp = require('openpgp')

var Cu = self.Components.utils
var Ci = self.Components.interfaces
var Cc = self.Components.classes

var gTxtConverter = Cc["@mozilla.org/txttohtmlconv;1"].createInstance(Ci.mozITXTToHTMLConv)
var convFlags = Ci.mozITXTToHTMLConv.kURLs || Ci.mozITXTToHTMLConv.kEntities

let messagePane = getFrame(window, "messagepane");

var messageListener = {
  onStartHeaders: function() {
    if ("autocrypt" in self.gExpandedHeaderView) {
      delete self.gExpandedHeaderView.autocrypt;
    }
  },
  onEndHeaders: function() {},
  onEndAttachments: function() {},
  onBeforeShowHeaderPane: function () {
    var autocryptHeader
    for (let h in self.currentHeaderData) {
      if (/^autocrypt\d*$/i.test(h)) {
        autocryptHeader = self.currentHeaderData[h].headerValue
      }
    }
    var myEmail = gMessageDisplay.folderDisplay.view.displayedFolder.parent.abbreviatedName
    var uriSpec = gFolderDisplay.selectedMessageUris[0]
    if (!autocryptHeader) return parseMessage(myEmail, uriSpec)

    var fromEmail = getAuthor(self.currentHeaderData.from.headerValue)
    var date = new Date(self.currentHeaderData.date.headerValue)
    autocrypt.processAutocryptHeader(autocryptHeader, fromEmail, date, function (err) {
      if (err) return onerror(err)
      return parseMessage(fromEmail, myEmail, uriSpec)
    })
  }
}

function decrypt (fromPublicKey, privateKey, cipherText) {
  if (!fromPublicKey || !privateKey) return console.error('one or more udnefined: ', fromPublicKey, privateKey)
  let bodyElement = messagePane.document.getElementsByTagName("body")[0];
  bodyElement.innerHTML = 'Attempting to decrypt...'
  var options = {
    message: openpgp.message.readArmored(cipherText),
    publicKey: openpgp.key.read(base64.toByteArray(fromPublicKey)).keys,
    privateKeys: openpgp.key.read(base64.toByteArray(privateKey)).keys
  }
  openpgp.decrypt(options).then(function (plaintext) {
    var html = gTxtConverter.scanTXT(plaintext.data, convFlags)
    bodyElement.innerHTML = html
  }).catch(function (err) {
    bodyElement.innerHTML = 'Decryption failed!'
  })
}

function contains (headerVal, str) {
  return headerVal.indexOf(str) > -1
}

function getEncrypted (contentType, mimeTree) {
  if (contains(contentType, 'multipart/encrypted')) {
    var parts = mimeTree.subParts
    if (parts.length === 2 &&
    contains(parts[0].fullContentType, 'application/pgp-encrypted')  &&
    contains(parts[1].fullContentType, 'application/octet-stream')) {
      return parts[1].body
    }
  }
  return null
}

function parseMessage (fromEmail, myEmail, uriSpec, cb) {
  console.log('getting mime tree for ', uriSpec)
  getMimeTreeFromUriSpec(uriSpec, function (mimeTree) {
    if (!mimeTree) return console.log('no mime tree')
    console.log('got mimeTree', mimeTree)
    var contentType = self.currentHeaderData['content-type'].headerValue
    var cipherText = getEncrypted(contentType, mimeTree)
    if (!cipherText) return console.log('not encrypted')
    autocrypt.getUser(myEmail, function (err, me) {
      if (err) return onerror(err)
      autocrypt.getUser(fromEmail, function (err, from) {
        if (err) return onerror(err)
        return decrypt(from.keydata, me.privateKey, cipherText)
      })
    })
  })
}

function getFrame (win, frameName) {
  for (var j = 0; j < win.frames.length; j++) {
    if (win.frames[j].name == frameName) {
      return win.frames[j];
    }
  }
  return null
}

function onerror (err) {
  console.error(err)
}

function getMimeTreeFromUriSpec (uriSpec, cb) {
  var done = function (data) {
    cb(getMimeTree(data))
  }
  var url = getUrlFromUriSpec(uriSpec)
  if (!url) return cb()

  var chan = streams.createChannel(url.spec);
  var bufferListener = streams.newStringStreamListener(done);
  chan.asyncOpen(bufferListener, null);
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

function getPayload (selectedMessage) {

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
