var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var squel = require("squel").useFlavour('mysql');
var db = require('./../../../common/db-connect.js')();
var util = require('./../../../common/util.js');

var google = {};

// Client ID, client secret and redirectUrl are defined at
// https://code.google.com/apis/console
google.clientId = '555054377171-n8geoctm8268uummgi35cb86uon8nusk.apps.googleusercontent.com';
google.clientSecret = process.env.AL_GOOGLE_CLIENT_SECRET;
google.redirectUrl = 'http://127.0.0.1:3000/auth/google/callback';

google.middleware = {};

// .authenticate()
// ===============
// - Use passport.authenticate() as route middleware to authenticate the request
// - This is first step in Google auth, which involves redirecting the client to google.com.
google.middleware.authenticate = function () {
    var authOptions = {
        scope: ['openid email']
    };

    return passport.authenticate('google', authOptions);
};

google.completeStrategy = function () {
    util.print2()
    var options = {
        clientID: google.clientId,
        clientSecret: google.clientSecret,
        callbackURL: google.redirectUrl
    };

    var verify = function (
        accessToken, // Unused
        refreshToken, // Unused
        profile, // User's google profile
        done // To be called once a user is found or created
    ) {
        util.print3(profile.id)
        var table = 'users';

        var sqlFindUser = squel
            .select()
            .from(table)
            .where('googleId = ' + db.escape(profile.id))
            .toString();

        db.query(sqlFindUser, function(err, users) {
            if (err) throw err;

            // If User already exists
            var userDoesExist = util.isPresent(users) && util.isPresent(users[0])
            if (userDoesExist) {
                return done(null, users[0]);
            }

            // If User does not already exist
            var image = (
                profile._json.image &&
                profile._json.image.url
            ) ? profile._json.image.url : null;

            var email = (
                util.isPresent(profile.emails) &&
                util.isPresent(profile.emails[0]) &&
                util.isPresent(profile.emails[0].value)
            ) ? profile.emails[0].value : null;

            var insertMap = {};
            insertMap.accountIsActive = false;
            insertMap.googleId = profile.id;
            insertMap.googleImageUrl = image;
            insertMap.googleEmail = email;
            insertMap.name = profile.displayName ||  null;

            var sqlInsertUser = squel
                .insert({replaceSingleQuotes: true})
                .into(table)
                .setFields(insertMap)
                .toString();

            db.query(sqlInsertUser, function(err, insertObj) {
                if (err) throw err;
                return done(null, insertMap);
            });
        });

        return done(null, profile); // This needs to be here. Idk why - WHR

    };

    return (new GoogleStrategy(options, verify));
}

module.exports = google;