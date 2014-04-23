var Readable = require('stream').Readable,
    levelup = require('levelup'),
    async = require('async'),
    through2 = require('through2'),
    slow = require('./lib/slow-stream'),
    inspect = require('./lib/inspect-stream'),
    sink = require('./lib/sink-stream')


var es = function(path) {

  var rs = new Readable(),
      source = levelup(path, {encoding: {encode: JSON.stringify, decode: JSON.parse}}),
      readyToTakeMore = false,
      hasMore = false,
      startingAt = 'ts-0',
      endingAt = 'ts~',
      produced = 0


  rs._read = function() {
    // console.log('GO!!!')
    readyToTakeMore = true
  }

  async.forever(
    function(next) {
      if (!readyToTakeMore) {
        // console.log('Not ready to take more')
        return setTimeout(next, 250)
      }
      hasMore = false
      // console.log('Fetch %d events starting at %s', 100, startingAt)
      source.createReadStream({start: startingAt, end: endingAt, limit: 100})
        .on('data', function(data) {
          hasMore = true
          source.get(['id', data.value].join('-'), function(err, value) {
            startingAt = data.key + '+'
            readyToTakeMore = rs.push(data.key)
            console.log('produced %d', ++produced)
            // console.log('readyToTakeMore = %s', readyToTakeMore)
          })
        })
        .on('close', function() {
          setTimeout(next, hasMore ? 0 : 1000)
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
  // .pipe(inspect(function(_data) {
  //   process.stdout.write('.')
  // }))
  .pipe(inspect(
    (function() {
      var counter = 0
      return function(_data) {
        console.log('consumed %d', ++counter)
      }
    })()
  ))
  .pipe(sink())

