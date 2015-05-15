// Helpers for SQL interactions
var Q = require('q');
var squel = require("squel").useFlavour('mysql');
var moment = require('moment');
var db = require('./db-connect.js')();
var util = require('./util.js');

var sql = {};

sql.momentFormat = 'YYYY-MM-DD';

sql.promise = function (query) {
    return Q.nbind(db.query, db)(query);
};

sql.findOrCreateUser = function (idColumn, idValue) {
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

sql.cast = {};

sql.cast.endOfWeek = function (yyyymmdd) {
    var startMoment = moment(yyyymmdd, this.momentFormat).add(-1, 'd');
    var eowDay = 6;
    var eowMoment = moment(startMoment);
    var inWeekend = (
        startMoment.day() == 5 ||
        startMoment.day() == 6
    );

    if (inWeekend) eowDay = 13;

    return eowMoment.day(eowDay).format(this.momentFormat);
};

sql.cast.counties = function (counties) {
    var _counties = [];
    counties.forEach(function(county) {
        _counties.push('county = ' + db.escape(county));
    });
    return _counties.join(' OR ');
};

module.exports = sql;