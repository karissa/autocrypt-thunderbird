const Cu = Components.utils;

Cu.import("chrome://autocrypt/content/openpgp.js"); /*global OpenPGPWrapper: false */
Cu.import("chrome://autocrypt/content/autocrypt.js"); /*global Autocrypt: false */

window.addEventListener("load", function(e) {
  startup();
}, false);

function startup() {
  var email = 'jonnyappleseed@gmail.com'
  console.log ('hi', email)

  Autocrypt.getUser(email, function (err, user) {
    if (err) {
      console.error(err)
      return generateKey(email, done)
    }
    done(null, user)
  })

  var done = function (err, user) {
    if (err) throw err
    var myPanel = document.getElementById("autocrypt-panel");
    myPanel.label = "Autocrypt: Enabled"
    console.log('user', user)
  }
}

function generateKey (email, cb) {
  openpgp.generateKey({
    userIds: [{ name: 'Jon Smith', email: email }],
    numBits: 3072,
    passphrase: 'super long and hard to guess'
  }).then((key) =>  {
    Autocrypt.addUser(email, key.publicKeyArmored, function (err) {
      if (err) return cb(err)
      console.log('created new user')
      cb()
    })
  })
}
