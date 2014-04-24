var es = require('../lib/event-stream'),
    slow = require('../lib/slow-stream'),
    inspect = require('../lib/inspect-stream'),
    sink = require('../lib/sink-stream')

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

