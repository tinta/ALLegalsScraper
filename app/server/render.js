// Functions that assist with rendering listings for region pages
var squel = require("squel").useFlavour('mysql');
var _ = require('lodash');
var Q = require('q');
var db = require('./../../common/db-connect.js')();
var sql = require('./../../common/sql.js');
var util = require('./../../common/util.js');
var timeframes = require('./../server/timeframes.js');
var regions = require('./../server/regions.js');

var render = {};

render.week = function (request, response, startDate, timeframe) {
    var scope = {};
    var region = request.params.region;
    var user = request.user;
    var promiseUser;
    var userExistsAndHasId;

    if (regions.contains(region)) {
        scope.region = regions.setCurrent(region);

        // Don't do user lookup if there is no ID
        var userExistsAndHasId = user && user.googleId;
        if (userExistsAndHasId) {
            promiseUser = sql.user.findOrCreate('googleId', user.googleId);
        } else {
            promiseUser = Q(false);
        }

        Q.all([
            promiseUser,
            sql.listings.findUntilEndOfWeek(scope.region, startDate)
        ])
        .then(function(results) {
            var user = results[0];
            if (util.isPresent(user)) scope.user = user;

            scope.listings = results[1][0];
            scope.regions = regions.all;
            scope.timeframe = timeframes.setRegion(region).setCurrent(timeframe);
            scope.timeframes = timeframes.all;

            response.render('region/index', scope);
        }, function(err) {
            if (err) throw err;
            response.redirect('/');
        });
    } else {
        response.redirect('/');
    }
};

module.exports = render;