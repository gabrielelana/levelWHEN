var through2 = require('through2')

module.exports = function(inspect) {
  inspect = inspect || function() { /* do nothing */ }
  return through2(function(data, _, next) {
    inspect(data)
    this.push(data)
    next()
  })
}
