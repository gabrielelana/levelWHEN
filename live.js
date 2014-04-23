var Readable = require('stream').Readable,
    levelup = require('levelup'),
    async = require('async'),
    through2 = require('through2'),
    slow = require('./lib/slow-stream'),
    inspect = require('./lib/inspect-stream'),
    sink = require('./lib/sink-stream')


var es = function(path, options) {
  options = options || {}

  var rs = new Readable({objectMode: true}),
      source = levelup(path, {encoding: {encode: JSON.stringify, decode: JSON.parse}}),
      startingAt = options.startingAt || 'ts-0',
      endingAt = options.endingAt || 'ts~',
      limit = options.limit || 100,
      msToWaitToTakeMore = options.msToWaitToTakeMore || 250,
      msToWaitToHaveMore = options.msToWaitToHaveMore || 1000

  var hasMore = false, readyToTakeMore = false

  rs._read = function() {
    readyToTakeMore = true
  }

  async.forever(
    function(next) {
      if (!readyToTakeMore) {
        return setTimeout(next, msToWaitToTakeMore)
      }
      hasMore = false
      source.createReadStream({start: startingAt, end: endingAt, limit: limit})
        .on('data', function(data) {
          hasMore = true
          source.get(['id', data.value].join('-'), function(err, value) {
            startingAt = data.key + '+'
            readyToTakeMore = rs.push(data.key)
          })
        })
        .on('close', function() {
          setTimeout(next, hasMore ? 0 : msToWaitToHaveMore)
        })
    },
    function(err) {
      console.error(err)
    }
  )

  return rs
}



es('.db/subscriptions')
  .pipe(slow(50))
  .pipe(inspect(function(_data) {
    process.stdout.write('.')
  }))
  // .pipe(inspect(
  //   (function() {
  //     var counter = 0
  //     return function(_data) {
  //       console.log('consumed %d', ++counter)
  //     }
  //   })()
  // ))
  .pipe(sink())

