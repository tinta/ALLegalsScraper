var moment = require('moment');
var mysql = require('mysql');

// Helpers for SQL interactions
var sqlize = {};
sqlize.momentFormat = 'YYYY-MM-DD';
sqlize.endOfWeek = function (yyyymmdd) {
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
sqlize.counties = function (counties) {
    var _counties = [];
    counties.forEach(function(county) {
        _counties.push('county = ' + mysql.escape(county));
    });
    return _counties.join(' OR ');
};

module.exports = sqlize;