// Helpers for SQL interactions

// Third-Party scripts
var Q = require('q');
var squel = require("squel").useFlavour('mysql');
var moment = require('moment');
var _ = require('lodash');

// Custom scripts
var db = require('./db-connect.js')();
var util = require('./util.js');
var regions = require('./collections/regions.js');

var sql = {};

sql.momentFormat = 'YYYY-MM-DD';

sql.promise = function (query) {
    return Q.nbind(db.query, db)(query);
};

sql.user = {};
sql.user.findOrCreate = function (idColumn, idValue) {
    var sqlFindUser = squel
        .select()
        .from('users')
        .where(idColumn + ' = ' + db.escape(idValue))
        .toString();

    return sql.promise(sqlFindUser).then(function(result) {
        var user;
        if (
            util.isPresent(result) &&
            util.isPresent(result[0]) &&
            util.isPresent(result[0][0])
        ) {
            user = util.prepareUser(result[0][0]);
            return Q(user);
        }

        return Q(false);
    });
};

sql.listings = {};

sql.listings.findInRange = function (currentRegion, sqlStart, sqlEnd) {
    var table = "foreclosures";
    var sqlCounties = sql.cast.counties(currentRegion.counties);
    var sqlInRange = squel
        .select()
        .from(table)
        .where('sale_date > ' + db.escape(sqlStart))
        .where('sale_date < ' + db.escape(sqlEnd))
        .where(sqlCounties)
        .toString();

    return sql.promise(sqlInRange);
};

sql.listings.findUntilEndOfWeek = function (region, sqlStart) {
    var sqlEnd = sql.cast.endOfWeek(sqlStart)
    return sql.listings.findInRange(region, sqlStart, sqlEnd);
};


sql.cast = {};

sql.cast.endOfWeek = function (yyyymmdd) {
    var startMoment = moment(yyyymmdd, sql.momentFormat);
    var eowDay = 6;
    var eowMoment = moment(startMoment);
    var inWeekend = (
        startMoment.day() == 5 ||
        startMoment.day() == 6
    );

    if (inWeekend) eowDay = 13;

    return eowMoment.day(eowDay).format(sql.momentFormat);
};

sql.cast.counties = function (counties) {
    if (!util.isPresent(counties)) {
        throw "Please provide a populated Array"
        return false;
    }
    var _counties = [];
    counties.forEach(function(county) {
        _counties.push('county = ' + db.escape(county));
    });
    return _counties.join(' OR ');
};

module.exports = sql;