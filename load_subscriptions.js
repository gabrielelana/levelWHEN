var levelup = require('levelup'),
    MongoClient = require('mongodb').MongoClient,
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
            var uid = doc['_id'],
                name = doc['type'],
                at = doc['created_at'].getTime()

            events.put([at, uid].join('-'), {
              'uid': uid,
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
            })
          } else {
            fixtures.close()
          }
        })
      })
    }
  )
})

