var Q = require('q');
var squel = require("squel").useFlavour('mysql');
var db = require('./db-connect.js')();
var util = require('./util.js');

var sql = {};

sql.promise = function (query) {
    return Q.nbind(db.query, db)(query);
};

sql.findOrCreateUser = function (idColumn, idValue) {
    util.print4('foo ' + idColumn + ' ' + idValue);
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

module.exports = sql;