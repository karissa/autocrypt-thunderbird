var crypto = require('crypto')
var base64 = require('base64-js')
var openpgp = require('openpgp')

var getEmail = require('./email').getEmail
var autocrypt = require('./autocrypt')()

var Cc = self.Components.classes
var Ci = self.Components.interfaces
var Cu = self.Components.utils

var header

window.addEventListener('compose-send-message', onSendMessage, true);
window.addEventListener('load', function (e) {
  startup();
}, false);

function onSendMessage (event) {
  var identity = getCurrentIdentity()
  var email = getEmail(identity)
  let msgcomposeWindow = document.getElementById("msgcomposeWindow");
  let sendMsgType = Number(msgcomposeWindow.getAttribute("msgtype"));
  if (header) {
    self.gMsgCompose.compFields.setHeader('Autocrypt', header)
  }
}

function done (err, user) {
  if (err) throw err
  var identity = getCurrentIdentity()
  var email = getEmail(identity)
  autocrypt.generateAutocryptHeader(email, function (err, _header) {
    header = _header
  })
}

function startup () {
  var identity = getCurrentIdentity()
  var email = getEmail(identity)
  autocrypt.getUser(email, function (err, user) {
    if (err) {
      return generateKey(email, done)
    }
    done(null, user)
  })
}

function unarmor (armored) {
  var unarmored = openpgp.armor.decode(armored)
  var data = unarmored.data
  return base64.fromByteArray(data)
}

function generateKey (email, cb) {
  // TODO: relate email with id in autocrypt and use that instead.
  // var id = `${crypto.randomBytes(24).toString('hex')}@autocrypt.org`
  openpgp.generateKey({
    userIds: [{ name: ' ', email: email }],
    numBits: 3072
  }).then((key) =>  {
    var publicKey = unarmor(key.publicKeyArmored).replace(/(.{72})/g, "$1\r\n")
    var privateKey = unarmor(key.privateKeyArmored)
    ac.createUser(email, {publicKey, privateKey}, cb)
  })
}
