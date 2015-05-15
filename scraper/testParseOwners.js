var db = require('./../common/db-connect.js')();
var squel = require("squel").useFlavour('mysql');
var parseOwners= require('./parseOwners.js');

var sqlFindListing = squel.select("body")
        .from("foreclosures")
        .where("name1 IS NULL")
        .limit(50)
        .toString();

db.query(sqlFindListing, function(err, result) {
    for(var i = 0; i < result.length; i++)
        console.log(parseOwners(result[i].body));
});
db.end();

