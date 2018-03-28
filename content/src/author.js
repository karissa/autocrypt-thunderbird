var getAuthor = require('parse-author')

module.exports = function (email) {
  var parsed = getAuthor(email)
  return parsed.email || parsed.name
}
