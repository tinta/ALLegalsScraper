var Q = require('q')
var moment = require('moment')
var util = require(process.cwd() + '/common/util.js')
var sql = require(process.cwd() + '/common/sql.js')
var timeframes = require(process.cwd() + '/common/collections/timeframes.js')
var regions = require(process.cwd() + '/common/collections/regions.js')

module.exports = function (app) {
  app.get('/:region', function (req, res) {
    var region = req.params.region
    var scope = {}
    var startDate
    var promiseUser

    if (regions.contains(region)) {
      startDate = moment()
        .add(-1, 'd')
        .format(sql.momentFormat)

      scope.region = regions.setCurrent(region)
      scope.regions = regions.all
      scope.timeframe = timeframes.setRegion(region).setCurrent('Current')
      scope.timeframes = timeframes.all

      if (req.user && req.user.googleId) {
        promiseUser = sql.user.findOrCreate('googleId', req.user.googleId)
      } else {
        promiseUser = Q(false)
      }

      Q.all([
        promiseUser,
        sql.listings.findUntilEndOfWeek(scope.region, startDate)
      ])
        .then(function (results) {
          var user = results[0]
          var listings = results[1][0]
          if (util.isPresent(user)) scope.user = user
          scope.listings = listings
          res.render('region/index', scope)
        }, function (err) {
          res.redirect('/')
          if (err) throw err
        })
    } else {
      res.redirect('/')
    }
  })

  app.get('/:region/next-week', function (req, res) {
    var region = req.params.region
    var scope = {}
    var startDate
    var promiseUser

    if (regions.contains(region)) {
      startDate = moment()
        .day(8)
        .format(sql.momentFormat)

      scope.region = regions.setCurrent(region)
      scope.regions = regions.all
      scope.timeframe = timeframes.setRegion(region).setCurrent('Next Week')
      scope.timeframes = timeframes.all

      if (req.user && req.user.googleId) {
        promiseUser = sql.user.findOrCreate('googleId', req.user.googleId)
      } else {
        promiseUser = Q(false)
      }

      Q.all([
        promiseUser,
        sql.listings.findUntilEndOfWeek(scope.region, startDate)
      ])
        .then(function (results) {
          var user = results[0]
          var listings = results[1][0]
          if (util.isPresent(user)) scope.user = user
          scope.listings = listings
          res.render('region/index', scope)
        }, function (err) {
          res.redirect('/')
          if (err) throw err
        })
    } else {
      res.redirect('/')
    }
  })

  app.get('/:region/all', function (req, res) {
    var region = req.params.region
    var promiseUser
    var scope = {}

    if (regions.contains(region)) {
      scope.region = regions.setCurrent(region)
      scope.regions = regions.all
      scope.timeframe = timeframes.setRegion(region).setCurrent('All')
      scope.timeframes = timeframes.all

      var startDate = moment().subtract(1, 'year').format(sql.momentFormat)
      var endDate = moment().add(1, 'year').format(sql.momentFormat)

      promiseUser = (req.user && req.user.googleId) ?
        sql.user.findOrCreate('googleId', req.user.googleId) :
        Q(false)

      Q.all([
        promiseUser,
        sql.listings.findInRange(scope.region, startDate, endDate)
      ])
        .then(function (results) {
          var user = results[0]

          if (util.isPresent(user)) scope.user = user
          scope.listings = results[1][0]

          res.render('region/index', scope)
        }, function (err) {
          if (err) throw err
        })
    } else {
      res.redirect('/')
    }
  })

  app.get('/:region/implausible', function (req, res) {
    var region = req.params.region
    var scope = {}
    var pastStartDate, pastEndDate, futureStartDate, futureEndDate, promiseUser

    if (regions.contains(region)) {
      pastStartDate = '0001-01-01'
      pastEndDate = '2015-03-01'
      futureStartDate = moment().add(1, 'year').format(sql.momentFormat)
      futureEndDate = '9999-12-31'

      scope.region = regions.setCurrent(region)
      scope.regions = regions.all
      scope.timeframe = timeframes.setRegion(region).setCurrent('Implausible')
      scope.timeframes = timeframes.all

      if (req.user && req.user.googleId) {
        promiseUser = sql.user.findOrCreate('googleId', req.user.googleId)
      } else {
        promiseUser = Q(false)
      }

      Q.all([
        promiseUser,
        sql.listings.findInRange(scope.region, pastStartDate, pastEndDate),
        sql.listings.findInRange(scope.region, futureStartDate, futureEndDate)
      ])
        .then(function (results) {
          var user = results[0]
          var pastListings = results[1][0] || []
          var futureListings = results[2][0] || []
          if (util.isPresent(user)) scope.user = user
          scope.listings = pastListings.concat(futureListings)
          res.render('region/index', scope)
        }, function (err) {
          console.log(err)
          res.redirect('/')
          if (err) throw err
        })
    } else {
      res.redirect('/')
    }
  })
}
