var memdb = require('memdb')
var autocrypt = require('autocrypt')


module.exports = function () {
  return autocrypt({
    storage: memdb({valueEncoding: 'json'})
  })
}
