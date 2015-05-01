// Libs
var Nightmare = require('nightmare');
var _ = require('lodash');
var moment = require('moment');
var squel = require("squel").useFlavour('mysql');
var Q = require('q');

// Custom scripts
var db = require('./../db-connect.js')();
var util = require('./../util.js');
var scrapeSaleDate = require('./scrapeSaleDate.js');
var scrapeAddress = require('./scrapeAddress.js');

var page = new Nightmare();

var table = "foreclosures";
var listings = {};
var startDate = moment().add(-1, 'day').format('MM-DD-YYYY');
var endDate = moment().add(0, 'day').format('MM-DD-YYYY');
var scrapeUrl = 'http://www.alabamalegals.com/index.cfm?fuseaction=home';
var counties = [
    60, // colbert
    1,  // jefferson
    59, // franklin
    4,  // lauderdale
    56, // blount
    57, // cullman
    65, // deKalb
    66, // jackson
    61, // lawrence
    67, // limestone
    5,  // madison
    63, // marshall
    62, // morgan
    '', // placholder. the last query always fails due to `Cannot enqueue Query after invoking quit.`
];

function promiseSql (query) {
    return Q.nbind(db.query, db)(query);
}

scrapeCounty(0);

function scrapeCounty (index) {
    var county = counties[index];
    var scrapedForeclosures;
    console.log('Scraping county #' + county)
    page.goto(scrapeUrl)
    .wait()
    .evaluate(function(county, startDate, endDate) {
        $('#selCounty').val(county);
        $('#from').val(startDate);
        $('#to').val(endDate);
    }, function () {}, county, startDate, endDate)
    .click('[onclick="newSearch()"]')
    .wait()
    .evaluate(function() {
        var foreclosures = {};
        var $rows = $('.jqgrow');

        var postOptions = {};
        postOptions.url = 'components/LegalsGatewayJ.cfc?method=getLegalDetails&returnformat=json&queryformat=column';
        postOptions.method = 'POST';
        postOptions.dataType = 'json';
        postOptions.data = {};
        postOptions.async = false;
        postOptions.success = function (res) {
            var body, isForeclosure, foreclosure;
            if (res.DATA) {
                body = res.DATA.BODY[0];
                isForeclosure = body.toLowerCase().indexOf('foreclosure') > -1;
                if (isForeclosure) {
                    foreclosure = defineForeclosure(res);
                    if (foreclosure) {
                        foreclosures[postOptions.data.id] = foreclosure;
                    }
                }
            }
        };

        function defineForeclosure (res) {
            var foreclosure = {};
            var body = res.DATA.BODY
                .join(' || ');
            foreclosure.body = body;
            foreclosure.caseId = res.DATA.REC_NUM[0];
            foreclosure.heading = res.DATA.HEADING[0];
            foreclosure.county = res.DATA.COUNTYNAME[0];
            foreclosure.pubDate = res.DATA.SDATE[0];
            foreclosure.source = res.DATA.NPNAME[0];

            return foreclosure;
        }

        $rows.each(function(i, row) {
            var $row = $(row);
            var id = $row.attr('id');
            // AL Legals expects the `id` field
            postOptions.data.id = id;
            $.ajax(postOptions);
        });

        return foreclosures;
    }, function(results) {
        scrapedForeclosures = results;
    })
    .run(function(err) {
        if (err) throw err;

        writeToDB(scrapedForeclosures).then(function() {
            if (counties[index + 1]) {
                scrapeCounty(index + 1);
            } else {
                db.end();
            }
        })
    });
}

function writeToDB (listings) {
    var writeToDBDeferred = Q.defer();
    var uids = {};
    uids.scraped = _.keys(listings);
    uids.present = [];
    uids.absent = [];
    uids.sql = [];
    var sqlFindListing, query;

    var count = {};
    count.inserts = 0;
    count.duplicates = 0;
    count.print = function () {
        console.log('Scraped Listings: ' + uids.scraped.length);
        console.log('Inserted Rows: ' + count.inserts);
        console.log('Duplicates Found: ' + count.duplicates);
        console.log(Array(50).join('='));
    }

    if (uids.scraped.length === 0) return;

    uids.scraped.forEach(function(uid, index) {
        uids.scraped[index] = db.escape(parseInt(uid));
        uids.sql.push('case_id = ' + uids.scraped[index]);
    });

    sqlFindListing = squel
        .select()
        .from(table)
        .where(uids.sql.join(" OR "))
        .toString();

    query = db.query(sqlFindListing);

    query.on('result', function(result) {
        uids.present.push(result.case_id);
    });

    query.on('end', function() {
        uids.absent = _.difference(uids.scraped, uids.present);

        var deferred = Q.defer();
        var loop = 0;

        if (uids.absent.length ==  0) {
            deferred.resolve(true);
            return;
        }

        uids.absent.forEach(function(absentUid) {
            var absentForeclosure = listings[absentUid];

            if (!absentForeclosure) {
                loop++;
                if (loop == uids.absent.length) deferred.resolve(true);
                return;
            }

            var body = absentForeclosure.body;
            var pubDate = moment(absentForeclosure.pubDate, 'MM-DD-YYYY').format('YYYY-MM-DD');
            var saleDate = scrapeSaleDate(body);

            var insertMap = {};
            insertMap["body"] = (body.length > 10000) ? body.substring(0,10000) : body;

            // ensure that this foreclosures doesn't already exist in the database, and if it does, return.
            var sqlFindDuplicates = squel
                .select({replaceSingleQuotes: true})
                .from(table)
                .where("body LIKE ?", insertMap["body"])
                .toString();

            promiseSql(sqlFindDuplicates).then(function(duplicates) {
                if (!util.isPresent(duplicates[0])) {
                    insertMap["case_id"] = parseInt(absentForeclosure.caseId);
                    insertMap["county"] = absentForeclosure.county;
                    insertMap["source"] = absentForeclosure.source;
                    insertMap["pub_date"] = pubDate;
                    insertMap["sale_date"] = saleDate;

                    insertMap = _.merge(insertMap, scrapeAddress(body));

                    var sqlInsertListing = squel
                        .insert({replaceSingleQuotes: true})
                        .into(table)
                        .setFields(insertMap)
                        .toString();

                    return promiseSql(sqlInsertListing);
                }

                count.duplicates += 1;
                return Q(false);
            })
            .then(function(insertObj) {
                if (insertObj) count.inserts++;
                loop++;
                if (loop == uids.absent.length) deferred.resolve(true);
            });
        });

        deferred.promise.then(function() {
            count.print();
            writeToDBDeferred.resolve(true)
        }, function(err) {
            throw err;
        });
    });

    return writeToDBDeferred.promise;
}
