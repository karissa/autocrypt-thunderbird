var autocrypt = require('autocrypt')
var base64 = require('base64-js')
var memdb = require('memdb')
var openpgp = require('openpgp')

var Cc = self.Components.classes
var Ci = self.Components.interfaces
var Cu = self.Components.utils

var ac = autocrypt({
  storage: memdb({valueEncoding: 'json'})
})

window.addEventListener('compose-send-message', onSendMessage, true);

function onSendMessage (event) {
  var email = getEmail()
  let msgcomposeWindow = document.getElementById("msgcomposeWindow");
  let sendMsgType = Number(msgcomposeWindow.getAttribute("msgtype"));
  ac.generateAutocryptHeader(email, function (err, header) {
    console.log('adding header', header)
    self.gMsgCompose.compFields.setHeader('Autocrypt', header)
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

window.addEventListener("load", function(e) {
  startup();
}, false);

function done (err, user) {
  if (err) throw err
  console.log('done', user)
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
    ac.addUser(email, base64.fromByteArray(data), function (err) {
      if (err) return cb(err)
      cb()
    })
  })
}
