var through2 = require('through2')

module.exports = function() {
  return through2(function(_data, _encoding, next) {
    next()
  })
}
