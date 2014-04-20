var rimraf = require('rimraf'),
    levelWHEN = require('../')

rimraf('.db/count_events_per_subscription', function(err) {
  levelWHEN('.db/count_events_per_subscription')
    .pullFrom('.db/subscriptions')
    .indexWith('subscription_id')
    .startWith({count: 0})
    .when({
      '$any': function(s, e) {
        return {count: s.count + 1}
      }
    })
    .run()
})
