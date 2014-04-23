var rimraf = require('rimraf'),
    moment = require('moment'),
    levelWHEN = require('../')

rimraf('.db/acquisition_report', function(err) {
  levelWHEN('.db/acquisition_report')
    .pullFrom('.db/subscriptions')
    .indexWith('subscription_id')
    .startWith({})
    .when({
      '$any': function(s, e) {
        var beforeStatus = s['status']
        if ((e['type'] === 'subscription-activation-requested') && !s['status']) {
          s['first_attempt_at'] = e['created_at']
          s['subscription_id'] = e['subscription_id']
          s['service_id'] = e['service_id']
          s['operator'] = e['operator']
          s['msisdn'] = e['msisdn']
          s['status'] = 'new'
          s['churn'] = false
        } else if (s['status']) {
          var todayWasFirstAttempt =
              moment(s['first_attempt_at']).zone('+02:00').format('YYYYMMDD') ===
              moment(e['created_at']).zone('+02:00').format('YYYYMMDD')

          if (s['status'] === 'new') {
            if (e['type'] === 'subscription-activation-succeeded') {
              if (todayWasFirstAttempt) {
                s['status'] = 'new billed'
                s['acquired_at'] = e['created_at']
              } else {
                s['status'] = 'billed'
              }
            } else if (e['type'] === 'subscription-activation-failed') {
              if (todayWasFirstAttempt) {
                s['status'] = 'new never billed'
                s['acquired_at'] = e['created_at']
              } else {
                s['status'] = 'never billed'
              }
            }
          }

          if (e['type'] === 'subscription-activation-recovered') {
            if ((s['status'] === 'new') || (s['status'] === 'new never billed')) {
              if (todayWasFirstAttempt) {
                s['status'] = 'new billed'
                s['acquired_at'] = e['created_at']
              } else {
                s['status'] = 'recovered'
              }
            } else if (s['status'] === 'never billed') {
              s['status'] = 'recovered'
            }
          }

          if (e['type'] === 'subscription-terminated') {
            var todayWasAcquired =
              s['acquired_at'] && (
                moment(s['acquired_at']).zone('+02:00').format('YYYYMMDD') ===
                moment(e['created_at']).zone('+02:00').format('YYYYMMDD')
              )
            s['churn'] = todayWasAcquired
          }
        }

        if ((s['status'] !== beforeStatus) && (e['subscription_id'] === '52d854086e73c3e01400129a')) {
          // TODO: here we should emit the event
          console.log(
            moment(e['created_at']).zone('+02:00').format('YYYYMMDD'),
            s['subscription_id'],
            e['type'],
            s['status'],
            s['churn']
          )
        }
        return s
      }
    })
    .run()
})
