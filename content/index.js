var autocrypt = require('autocrypt')

var myStorage = {
  get: function (key, cb) { return cb() },
  put: function (key, data, cb) { return cb() },
  del: function (key, cb) { return cb()}
}
var ac = autocrypt({
  storage: myStorage
})

EXPORTED_SYMBOLS = [ 'Autocrypt' ]

Autocrypt = {
  addUser: function (email, publicKey, opts, cb) {
    ac.addUser(email, publicKey, opts, cb)
  },
  getUser: function (email, cb) {
    ac.getUser(email, cb)
  }
}
