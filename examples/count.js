var rimraf = require('rimraf'),
    levelWHEN = require('../'),
    _ = require('lodash')

rimraf('.db/count_events_per_subscription', function(err) {
  levelWHEN('.db/count_events_per_subscription')
    .pullFrom('.db/subscriptions', 'subscriptions')
    .indexWith('subscription_id')
    .startWith({count: 0})
    .when({
      '$any': function(s, e, k) {
        return _({count: s.count + 1})
          .tap(function(n) {
            console.log(k, n)
            return n
          })
          .value()
      }
    })
    .run()
})
