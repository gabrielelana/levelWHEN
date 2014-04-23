var Readable = require('stream').Readable,
    levelup = require('levelup'),
    through2 = require('through2'),
    async = require('async')


module.exports = function(path, options) {
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
      // console.log('Fetch %d events from %s starting at %s', limit, path, startingAt)
      source.createReadStream({start: startingAt, end: endingAt, limit: limit})
        .on('data', function(data) {
          hasMore = true
          source.get(['id', data.value].join('-'), function(err, value) {
            startingAt = data.key + '+'
            readyToTakeMore = rs.push(JSON.stringify(data))
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
