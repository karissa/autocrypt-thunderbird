var crypto = require('crypto')
var base64 = require('base64-js')
var openpgp = require('openpgp')

var getEmail = require('./email').getEmail
var autocrypt = require('./autocrypt')()

var Cc = self.Components.classes
var Ci = self.Components.interfaces
var Cu = self.Components.utils

Cu.import("resource:///modules/mailServices.js");

var ready = false

window.addEventListener('compose-send-message', onSendMessage, true);
window.addEventListener('load', function (e) {
  startup();
}, false);

function onerror (err) {
  if (err) console.error(err)
}

function encrypt (fromEmail, toEmail, plainText, cb) {
  while (!ready) {} // once we have the key ready, lets do this
  autocrypt.getUser(fromEmail, function (err, me) {
    if (err) return cb(err)
    autocrypt.getUser(toEmail, function (err, toUser) {
      if (err) return cb(err)
      var options = {
        data: plainText,
        publicKeys: openpgp.key.read(base64.toByteArray(toUser.keydata)).keys,
        privateKeys: openpgp.key.read(base64.toByteArray(me.privateKey)).keys
      }
      openpgp.encrypt(options).then(function (cipherText) {
        cb(null, cipherText)
      })
    })
  })
}

function onSendMessage (event) {
  var identity = getCurrentIdentity()
  var email = getEmail(identity)
  let msgSend = Cc['@mozilla.org/messengercompose/send;1'].createInstance(Ci.nsIMsgSend);
  let progress = Cc["@mozilla.org/messenger/progress;1"].createInstance(Ci.nsIMsgProgress);
  let currentMessage = self.gMsgCompose.compFields
  // lets try to encrypt this
  encrypt(email, currentMessage.to, currentMessage.body, function (err, cipherText) {
    if (err) onerror(err)
    if (cipherText) {
      // halalujah, it can be encrypted
      currentMessage.body = cipherText.data
    }
    // ok send the message
    autocrypt.generateAutocryptHeader(email, function (err, autocryptHeader) {
      if (err) onerror(err)
      if (autocryptHeader) currentMessage.setHeader('Autocrypt', autocryptHeader)
      let am = MailServices.accounts
      self.gMsgCompose.SendMsg(msgSend.nsMsgDeliverNow,
        am.defaultAccount.defaultIdentity, // identity
        am.defaultAccount, // account
        null, // message window
        progress) // nsIMsgProgress
    })
  })
  event.preventDefault()
  return false
}

function startup () {
  var identity = getCurrentIdentity()
  var email = getEmail(identity)

  function done (err) {
    if (err) return onerror(err)
    // we're ready to send mail!
    ready = true
    return
  }

  autocrypt.getUser(email, function (err, user) {
    // if the user is not found generate the key
    if (err) return generateKey(email, done)
    done(null)
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
    var publicKey = unarmor(key.publicKeyArmored)
    var privateKey = unarmor(key.privateKeyArmored)
    autocrypt.createUser(email, {publicKey, privateKey}, cb)
  })
}
