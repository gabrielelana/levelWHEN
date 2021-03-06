var Readable = require('stream').Readable,
    levelup = require('levelup'),
    through2 = require('through2'),
    async = require('async')


module.exports = function(path, options) {
  options = options || {}

  var rs = new Readable({objectMode: true}),
      source = levelup(path, {encoding: {encode: JSON.stringify, decode: JSON.parse}}),
      startingAt = options.startingAt || '$ts-0',
      endingAt = options.endingAt || '$ts~',
      limit = options.limit || 100,
      msToWaitToTakeMore = options.msToWaitToTakeMore || 250,
      msToWaitToHaveMore = options.msToWaitToHaveMore || 1000,
      key = options.key,
      db = options.db

  var hasMore = false, readyToTakeMore = false

  rs._read = function() {
    readyToTakeMore = true
  }

  db.get(key, function(err, marker) {
    if (!err) {
      startingAt = marker['at']
    }
    async.forever(
      function(next) {
        if (!readyToTakeMore) {
          return setTimeout(next, msToWaitToTakeMore)
        }
        hasMore = false
        db.put(key, {at: startingAt}, function() {
          // console.log('Fetch %d events from %s starting at %s', limit, path, startingAt)
          source.createReadStream({start: startingAt, end: endingAt, limit: limit})
            .on('data', function(data) {
              hasMore = true
              startingAt = data.key + '+'
              readyToTakeMore = rs.push(JSON.stringify(data.value))
            })
            .on('close', function() {
              setTimeout(next, hasMore ? 0 : msToWaitToHaveMore)
            })
        })
      },
      function(err) {
        console.error(err)
      }
    )
  })

  return rs
}
