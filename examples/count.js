/* global EventStore, EventStream */

// NOTE: This is an example how things could be

new EventStream('.db/count_events_per_subscription') // EventStore#put
  .pullFrom('.db/subscriptions') // EventStore#stream
  .indexWith('subscription_id')
  .startWith({count: 0})
  .when({
    '$any': function(s, e) {
      return s.count + 1
    }
  })
  .pushTo('es://127.0.0.1:4224/backup') // EventStore
  .on('event', function(e) {
    console.log(e)
  })
