var passport = require('passport')
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
var squel = require('squel').useFlavour('mysql')
var db = require('./../../../common/db-connect.js')()
var util = require('./../../../common/util.js')
var sql = require('./../../../common/sql.js')
var Q = require('q')

var google = {}

// Client ID, client secret and redirectUrl are defined at
// https://code.google.com/apis/console
google.clientId = '555054377171-n8geoctm8268uummgi35cb86uon8nusk.apps.googleusercontent.com'
google.clientSecret = process.env.AL_GOOGLE_CLIENT_SECRET
google.redirectUrl = (process.env.NODE_ENV === 'production') ?
  'http://legals.xmunoz.com/auth/google/callback/' :
  'http://127.0.0.1:3000/auth/google/callback/'

google.middleware = {}

// .authenticate()
// ===============
// - Use passport.authenticate() as route middleware to authenticate the request
// - This is first step in Google auth, which involves redirecting the client to google.com.
google.middleware.authenticate = function () {
  var authOptions = {
    scope: ['openid email']
  }

  return passport.authenticate('google', authOptions)
}

google.completeStrategy = function () {
  var options = {
    clientID: google.clientId,
    clientSecret: google.clientSecret,
    callbackURL: google.redirectUrl
  }

  var verify = function (
    accessToken, // Unused
    refreshToken, // Unused
    profile, // User's google profile
    done // To be called once a user is found or created
  ) {
    var table = 'users'

    var sqlFindUser = squel
      .select()
      .from(table)
      .where('googleId = ' + db.escape(profile.id))
      .toString()

    sql.promise(sqlFindUser)
      .then(function (results) {
        // If User already exists
        var userDoesExist = (
        util.isPresent(results) &&
          util.isPresent(results[0]) &&
          util.isPresent(results[0][0])
        )
        if (userDoesExist) {
          return Q(results[0][0])
        }

        return Q(null)
      }).then(function (user) {
      if (user !== null) {
        return Q(user)
      }

      // If User does not already exist
      var image = (
      profile._json.image &&
      profile._json.image.url
        ) ? profile._json.image.url : null

      var email = (
      util.isPresent(profile.emails) &&
      util.isPresent(profile.emails[0]) &&
      util.isPresent(profile.emails[0].value)
        ) ? profile.emails[0].value : null

      var insertMap = {}
      insertMap.accountIsActive = false
      insertMap.googleId = profile.id
      insertMap.googleImageUrl = image
      insertMap.googleEmail = email
      insertMap.name = profile.displayName || null

      var sqlInsertUser = squel
        .insert({replaceSingleQuotes: true})
        .into(table)
        .setFields(insertMap)
        .toString()

      var promiseInsert = sql.promise(sqlInsertUser)
        .then(function (insertObj) {
          if (util.isPresent(insertObj)) return Q(insertMap)
          return Q(false)
        })

      return promiseInsert
    }).then(function (user) {
      return done(null, user)
    })

  }

  return (new GoogleStrategy(options, verify))
}

module.exports = google
