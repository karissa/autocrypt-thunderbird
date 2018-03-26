var ac = require('./autocrypt')
var base64 = require('base64-js')
var openpgp = require('openpgp')

var Cc = self.Components.classes
var Ci = self.Components.interfaces
var Cu = self.Components.utils


var header

window.addEventListener('compose-send-message', onSendMessage, true);
window.addEventListener('load', function (e) {
  startup();
}, false);

function onSendMessage (event) {
  var email = getEmail()
  let msgcomposeWindow = document.getElementById("msgcomposeWindow");
  let sendMsgType = Number(msgcomposeWindow.getAttribute("msgtype"));
  if (header) {
    self.gMsgCompose.compFields.setHeader('Autocrypt', header)
  }
}

function done (err, user) {
  if (err) throw err
  var email = getEmail()
  ac.generateAutocryptHeader(email, function (err, _header) {
    header = _header
  })
}

function startup() {
  var email = getEmail()
  ac.getUser(email, function (err, user) {
    if (err) {
      console.error(err)
      return generateKey(email, done)
    }
    done(null, user)
  })
}

function generateKey (email, cb) {
  openpgp.generateKey({
    userIds: [{ name: 'Jon Smith', email: email }],
    numBits: 3072,
    passphrase: 'super long and hard to guess'
  }).then((key) =>  {
    var unarmored = openpgp.armor.decode(key.publicKeyArmored)
    var data = unarmored.data
    var keyData = base64.fromByteArray(data)
    ac.addUser(email, keyData.replace(/(.{72})/g, "$1\r\n"), function (err) {
      if (err) return cb(err)
      cb()
    })
  })
}

function getEmail () {
  var ac = getAccountForIdentity()
  console.log('identity', ac)
  return ac.defaultIdentity.email
}

function getAccountForIdentity () {
  var identity = getCurrentIdentity()
  let accountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);

  for (let acct = 0; acct < accountManager.accounts.length; acct++) {
    let ac = accountManager.accounts.queryElementAt(acct, Ci.nsIMsgAccount);

    for (let i = 0; i < ac.identities.length; i++) {
      let id = ac.identities.queryElementAt(i, Ci.nsIMsgIdentity);
      if (id.key === identity.key) {
        return ac;
      }
    }
  }

  return null;
}
