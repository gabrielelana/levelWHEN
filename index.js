var levelup = require('levelup'),
    ts = require('monotonic-timestamp'),
    es = require('./lib/event-stream'),
    sink = require('./lib/sink-stream'),
    through2 = require('through2'),
    _ = require('lodash')

var LevelWHEN = (function(LevelWHEN) {

  LevelWHEN = function(path) {
    this.db = levelup(path, {createIfMissing: true, encoding: {encode: JSON.stringify, decode: JSON.parse}})
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

  LevelWHEN.prototype.emit = function(event, at, ns) {
    var eventToUseAsSource = {type: 'put', key: '$ts-' + ts(), value: event},
        eventsToStore = [eventToUseAsSource]

    if (at && ns) {
      eventsToStore.push({type: 'put', key: ns + '-' + at, value: event})
    }
    this.db.batch(eventsToStore)
  }

  LevelWHEN.prototype.run = function() {
    var aggregator = this.aggregator,
        sourcePath = this.sourcePath,
        db = this.db

    es(sourcePath)
      .pipe(through2({objectMode: true}, function(data, _encoding, next) {
        process(JSON.parse(data), aggregator, function(err, key, value) {
          // console.log(key, value)
          this.push({key: key, value: value})
        }.bind(this))
        next()
      }))
      .pipe(db.createWriteStream())
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
          _.clone(aggregator.partialStatusOfAllAggregates[index]), value['data']
        )
      cb(null, index, aggregator.partialStatusOfAllAggregates[index])
    }
  }

  return LevelWHEN

})({})


module.exports = function(dbPath) {
  return new LevelWHEN(dbPath)
}
