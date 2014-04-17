var levelup = require('levelup'),
    MongoClient = require('mongodb').MongoClient,
    ts = require('monotonic-timestamp'),
    rimraf = require('rimraf')

rimraf('.db/subscriptions', function(err) {
  if (err) {
    return console.error(err)
  }
  levelup(
    '.db/subscriptions',
    {createIfMissing: true, encoding: {encode: JSON.stringify, decode: JSON.parse}},
    function (err, events) {
      MongoClient.connect('mongodb://127.0.0.1:27017/levelWHEN', function(err, fixtures) {
        if (err) {
          return console.error(err)
        }

        fixtures.collection('subscriptions').find({}).each(function(err, doc) {
          if (doc) {
            var id = doc['_id'],
                name = doc['type'],
                at = ts()

            var value = {
              'id': id,
              'name': name,
              'at': at,
              'data': {
                'subscription_id': doc['subscription_id'],
                'service_id': doc['service_id'],
                'starting_state': doc['starting_state'],
                'ending_state': doc['ending_state'],
                'operator': doc['operator'],
                'msisdn': doc['subscriber_id'],
                'created_at': doc['created_at'],
              }
            }

            events.batch([
              {type: 'put', key: ['id', id].join('-'), value: value},
              {type: 'put', key: ['ts', at].join('-'), value: id},
              {type: 'put', key: ['ev', at, name].join('-'), value: id},
            ])
          } else {
            fixtures.close()
          }
        })
      })
    }
  )
})

