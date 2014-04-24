var rimraf = require('rimraf'),
    moment = require('moment'),
    levelWHEN = require('../')

rimraf('.db/acquisition_report', function(err) {
  levelWHEN('.db/acquisition_report')
    .pullFrom('.db/subscriptions')
    .indexWith('subscription_id')
    .startWith({})
    .when({
      '$any': function(s, e, k, lw) {
        var beforeStatus = s['status']

        if ((e['$name'] === 'subscription-activation-requested') && !s['status']) {
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
            if (e['$name'] === 'subscription-activation-succeeded') {
              if (todayWasFirstAttempt) {
                s['status'] = 'new billed'
                s['acquired_at'] = e['created_at']
              } else {
                s['status'] = 'billed'
              }
            } else if (e['$name'] === 'subscription-activation-failed') {
              if (todayWasFirstAttempt) {
                s['status'] = 'new never billed'
                s['acquired_at'] = e['created_at']
              } else {
                s['status'] = 'never billed'
              }
            }
          }

          if (e['$name'] === 'subscription-activation-recovered') {
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

          if (e['$name'] === 'subscription-terminated') {
            var todayWasAcquired =
              s['acquired_at'] && (
                moment(s['acquired_at']).zone('+02:00').format('YYYYMMDD') ===
                moment(e['created_at']).zone('+02:00').format('YYYYMMDD')
              )
            s['churn'] = todayWasAcquired
          }
        }

        if (s['status'] !== beforeStatus) {
          lw.emit(
            {
              '$id': e['$id'],
              '$source': 'acquisition-report',
              'status': s['status'],
              'instant_churn': s['churn'],
              'subscription_id': s['subscription_id'],
              'service_id': s['subscription_id'],
              'operator': s['operator'],
              'msisdn': s['msisdn'],
              'at': e['created_at'],
            },
            moment(e['created_at']).toDate().getTime(),
            'ar'
          )
        }

        process.stdout.write('.')
        return s
      }
    })
    .run()
})
