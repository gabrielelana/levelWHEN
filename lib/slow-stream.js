var through2 = require('through2')

module.exports = function(msToWait) {
  return through2(function(data, _, next) {
    var self = this
    setTimeout(function() {
      self.push(data)
      next()
    }, msToWait)
  })
}
