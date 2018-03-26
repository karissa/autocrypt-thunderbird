var memdb = require('memdb')
var autocrypt = require('autocrypt')

var ac = autocrypt({
  storage: memdb({valueEncoding: 'json'})
})

module.exports = ac
