var Readable = require('stream').Readable,
    levelup = require('levelup'),
    async = require('async'),
    through2 = require('through2'),
    path = '.db/subscriptions',
    startingAt = 'ts-0',
    endingAt = 'ts~'

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

// es('.db/subscriptions').pipe(process.stdout)

var consumed = 0
es('.db/subscriptions')
  .pipe(
    through2(function(data, enc, next) {
      var self = this
      setTimeout(function() {
        console.log('consumed %d', ++consumed)
        self.push(data)
        next()
      }, 50)
    })
  )
  .pipe(
    through2(function(data, enc, next) {
      next()
    })
  )
