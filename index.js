var levelup = require('levelup'),
    ts = require('monotonic-timestamp'),
    es = require('./lib/event-stream'),
    folding = require('./lib/folding'),
    through2 = require('through2'),
    _ = require('lodash')

var LevelWHEN = (function(LevelWHEN) {

  LevelWHEN = function(path) {
    this.db = levelup(path, {createIfMissing: true, encoding: {encode: JSON.stringify, decode: JSON.parse}})
    this.folding = folding(this.db)
  }

  LevelWHEN.prototype.indexWith = function(keyOrExtractor) {
    if (_.isFunction(keyOrExtractor)) {
      this.folding.indexWith = keyOrExtractor
    }
    this.folding.indexWith = function(event) {
      return event[keyOrExtractor]
    }
    return this
  }

  LevelWHEN.prototype.startWith = function(initialStatus) {
    this.folding.startWith = initialStatus
    return this
  }

  LevelWHEN.prototype.when = function(howToFoldEvents) {
    this.folding.howToFoldEvents = howToFoldEvents
    return this
  }

  LevelWHEN.prototype.pullFrom = function(sourcePath) {
    this.sourcePath = sourcePath
    return this
  }

  LevelWHEN.prototype.emit = function(event, at, ns) {
    var eventToUseAsSource = {type: 'put', key: '$ts-' + ts(), value: event},
        eventsToStore = [eventToUseAsSource]

    if (at && ns) {
      eventsToStore.push({type: 'put', key: ns + '-' + at, value: event})
    }
    this.db.batch(eventsToStore)
  }

  LevelWHEN.prototype.run = function() {
    var folding = this.folding,
        sourcePath = this.sourcePath,
        self = this

    es(sourcePath)
      .pipe(through2({objectMode: true}, function(data, _encoding, next) {
        folding.fold(JSON.parse(data))
        next()
      }))
  }

  return LevelWHEN

})({})


module.exports = function(dbPath) {
  return new LevelWHEN(dbPath)
}
