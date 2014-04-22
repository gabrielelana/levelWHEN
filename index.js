var levelup = require('levelup'),
    ts = require('monotonic-timestamp'),
    async = require('async'),
    _ = require('lodash')

var LevelWHEN = (function(LevelWHEN) {

  LevelWHEN = function(dbPath) {
    this.dbPath = dbPath
    this.aggregator = {
      partialStatusOfAllAggregates: {}
    }
  }

  LevelWHEN.prototype.indexWith = function(keyOrExtractor) {
    if (_.isFunction(keyOrExtractor)) {
      this.aggregator.indexWith = keyOrExtractor
    }
    this.aggregator.indexWith = function(event) {
      return event['data'][keyOrExtractor]
    }
    return this
  }

  LevelWHEN.prototype.startWith = function(initialStatus) {
    this.aggregator.startWith = initialStatus
    return this
  }

  LevelWHEN.prototype.when = function(howToProcessEvents) {
    this.aggregator.howToProcessEvents = howToProcessEvents
    return this
  }

  LevelWHEN.prototype.pullFrom = function(sourcePath) {
    this.sourcePath = sourcePath
    return this
  }

  LevelWHEN.prototype.run = function() {
    var aggregator = this.aggregator,
        sourcePath = this.sourcePath,
        dbPath = this.dbPath

    open(dbPath, function(err, db) {
      open(sourcePath, function(err, source) {
        var startingAt = 'ts-0',
            endingAt = 'ts~'

        async.forever(
          function(next) {
            var isActive = false
            console.log('Fetch %d events starting at %s', 100, startingAt)
            source.createReadStream({start: startingAt, end: endingAt, limit: 100})
              .on('data', function(data) {
                isActive = true
                source.get(['id', data.value].join('-'), function(err, value) {
                  // TODO: keep startingAt stored in metadata
                  startingAt = data.key + '+'
                  process(value, aggregator, function(err, key, value) {
                    // console.log(key, value)
                    db.put(key, value)
                  })
                })
              })
              .on('close', function() {
                setTimeout(next, isActive ? 0 : 1000)
              })
          },
          function(err) {
            console.error(err)
          }
        )
      })
    })
  }

  function open(path, cb) {
    levelup(path, {createIfMissing: true, encoding: {encode: JSON.stringify, decode: JSON.parse}}, cb)
  }

  function process(value, aggregator, cb) {
    var index = aggregator.indexWith(value)
    if (index !== undefined) {
      // TODO: keep partialStatusOfAllAggregates stored somewhere
      if (aggregator.partialStatusOfAllAggregates[index] === undefined) {
        aggregator.partialStatusOfAllAggregates[index] = aggregator.startWith
      }
      // TODO: select aggregation logic based on event name
      aggregator.partialStatusOfAllAggregates[index] =
        aggregator.howToProcessEvents['$any'](
          aggregator.partialStatusOfAllAggregates[index], value['data']
        )
      cb(null, index, aggregator.partialStatusOfAllAggregates[index])
    }
  }

  return LevelWHEN

})({})


module.exports = function(dbPath) {
  return new LevelWHEN(dbPath)
}
