var levelup = require('levelup'),
    ts = require('monotonic-timestamp'),
    lws = require('./lib/lw-stream'),
    folding = require('./lib/folding'),
    through2 = require('through2'),
    express = require('express'),
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

  LevelWHEN.prototype.pullFrom = function(sourcePath, markerKey) {
    this.sourcePath = sourcePath
    this.markerKey = '$pm-' + markerKey
    return this
  }

  LevelWHEN.prototype.listenTo = function(port, defineRoutesOn) {
    this.listenOnPort = port
    this.app =
      express()
        .set('lw', this)
        .get('/ping', function(req, res) {
          res.send('pong')
        })
        .get('/e/:start/:limit', function(req, res) {
          var startingAt = '$ts-' + req.params.start,
              limit = parseInt(req.params.limit, 10),
              endingAt = '$ts~',
              isFirst = true

          res.writeHead(200, {'Content-Type': 'application/json'})
          res.write('[')
          req.app.get('lw').db.createReadStream({start: startingAt, end: endingAt, limit: limit})
            .on('data', function(data) {
              if (!isFirst) {
                res.write(',')
              }
              res.write(JSON.stringify(data.value))
              isFirst = false
            })
            .on('close', function() {
              res.end(']')
            })
        })
    if (defineRoutesOn) {
      defineRoutesOn(this.app)
    }
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

    listen(self, function() {
      lws(sourcePath, {key: self.markerKey, db: self.db})
        .pipe(through2({objectMode: true}, function(data, _encoding, next) {
          folding.fold(JSON.parse(data), self)
          next()
        }))
    })
  }

  return LevelWHEN

  function listen(lw, callback) {
    if (lw.app && lw.listenOnPort) {
      return lw.app.listen(lw.listenOnPort, callback)
    }
    callback()
  }

})({})


module.exports = function(dbPath) {
  return new LevelWHEN(dbPath)
}
