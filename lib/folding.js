var _ = require('lodash')

var Folding = function Folding(db, ns) {
  this.db = db
  this.ns = ns + '-'
  this.cache = {}
  this.startWith = {}
  this.indexWith = function(event) { return event['$id'] || 1 }
  this.howToFoldEvents = function(s, e) { return null }
}

Folding.prototype.put = function(key, value) {
  var cache = this.cache

  cache[key] = value
  this.db.put(this.ns + key, value, function(err) {
    if (cache[key] === value) {
      delete cache[key]
    }
  })
}

Folding.prototype.get = function(key, callback) {
  var cache = this.cache

  if (cache[key]) {
    return callback(null, cache[key])
  }
  this.db.get(this.ns + key, function(err, value) {
    if (err) {
      return callback(err, value)
    }
    if (cache[key] && (cache[key] !== value)) {
      return callback(null, cache[key])
    }
    return callback(null, value)
  })
}

Folding.prototype.fold = function(event, lw) {
  var self = this, index = self.indexWith(event)
  if (index) {
    self.get(index, function(err, previousFoldingStatus) {
      if (err) {
        previousFoldingStatus = self.startWith
      }
      var nextFoldingStatus =
        self.howToFoldEvents['$any'](
          _.clone(previousFoldingStatus), event, index, lw
        )
      if (nextFoldingStatus && (JSON.stringify(nextFoldingStatus) !== JSON.stringify(previousFoldingStatus))) {
        self.put(index, nextFoldingStatus)
      }
    })
  }
}

module.exports = function(db) {
  return new Folding(db, '$fs')
}
