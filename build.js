var fs = require('fs')
var browserify = require('browserify')
var path = require('path')

var files = [
  'messengercompose',
  'messenger'
]

files.forEach(function (file) {
  var b = browserify()
  b.add(path.join(__dirname, 'content', 'src', file + '.js'))
  b.require('crypto-browserify', {expose: 'crypto'})
  b.require('buffer')
  b.bundle().pipe(fs.createWriteStream(path.join(__dirname, 'content', file + '.js')))
})
