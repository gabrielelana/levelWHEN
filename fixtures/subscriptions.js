var mongodb = require('mongodb'),
    rimraf = require('rimraf'),
    levelWHEN = require('../')

// !!! This will work with fixture local to my dev machine
// !!! More general fixtures with related examples will be available soon

rimraf('.db/subscriptions', function(err) {
  var lw = levelWHEN('.db/subscriptions')
  mongodb.MongoClient.connect('mongodb://127.0.0.1:27017/levelWHEN', function(err, fixtures) {
    fixtures.collection('subscriptions').find({}).sort({'created_at': 1}).each(function(err, doc) {
      if (!doc) {
        process.stdout.write('END\n')
        return fixtures.close()
      }
      process.stdout.write('.')
      lw.emit({
        '$id': doc['_id'],
        '$name': doc['type'],
        '$source': 'subscription-engine',
        '$at': Date.parse(doc['created_at']),
        'created_at': doc['created_at'],
        'subscription_id': doc['subscription_id'],
        'service_id': doc['service_id'],
        'operator': doc['operator'],
        'msisdn': doc['subscriber_id'],
      })
    })
  })
})
