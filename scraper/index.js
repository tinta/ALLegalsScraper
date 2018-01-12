// Libs
var Nightmare = require('nightmare');
var _ = require('lodash');
var moment = require('moment');
var squel = require("squel").useFlavour('mysql');
var Q = require('q');

// Custom scripts
var db = require('./../common/db-connect.js')();
var util = require('./../common/util.js');
var sql = require('./../common/sql.js');
var parseSaleDate = require('./scrapers/scrapeSaleDate.js');
var parseAddress= require('./scrapers/scrapeAddress.js');
var parseOwners= require('./scrapers/scrapeOwners.js');
var parseAttorneys= require('./scrapers/scrapeAttorneys.js');
var parseBank= require('./scrapers/scrapeBank.js');

// Initializations
const page = new Nightmare();

var table = "foreclosures";
var startDate = moment().add(-1, 'day').format('MM-DD-YYYY');
var endDate = moment().add(0, 'day').format('MM-DD-YYYY');
var scrapeUrl = "https://www.alabamapublicnotices.com/";
var counties = [
    // Northeast
    65, // deKalb
    66, // jackson
    67, // limestone
    5,  // madison
    63, // marshall
    62, // morgan

    // Northwest
    59, // franklin
    60, // colbert
    4,  // lauderdale
    61, // lawrence

    // Mid
    56, // blount
    57, // cullman
    1,  // jefferson
    36, // Shelby

    // Midwest
    23, // Tuscaloosa
    20, // Marion
    6,  // Lamar
    21, // Fayette
    58, // Winston
    22, // Walker
    19, // Pickens

    // Mideast
    64, // Cherokee
    55, // Etowah
    38, // Talladega
    54, // Calhoun
    3,  // Clay
    52, // Randolph
    53 // Cleburne
];

scrapeCounty(0);

function scrapeCounty (index) {
    var county = counties[index];
    var scrapedForeclosures;
    console.log('Scraping county #' + county)
    page.goto(scrapeUrl)
    .wait()
    .select('#ctl00_ContentPlaceHolder1_QuickSearchForm1_ddlPopularSearches', '3')
    .wait('#ctl00_ContentPlaceHolder1_WSExtendedGridNP1_GridView1')
    .evaluate(() =>
      document.querySelector("#ctl00_ContentPlaceHolder1_WSExtendedGridNP1_GridView1 > tbody > tr:nth-child(3) > td > table")[0])
/*
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
*/
    .end()
    .then((foo) => console.log('foo: ' + foo))
    .catch((error) => {
        console.error('boo:' + error)
    })
/*
        writeToDB(scrapedForeclosures).then(function() {
            if (counties[index + 1]) {
                scrapeCounty(index + 1);
            } else {
                db.end();
            }
        })
*/
}

function writeToDB (listings) {
    var writeToDBDeferred = Q.defer();
    var uids = {};
    uids.scraped = _.keys(listings);
    uids.present = [];
    uids.absent = [];
    uids.sql = [];
    var sqlFindListing, query;

    console.log(Array(50).join('=+'));

    var count = {};
    count.inserts = 0;
    count.duplicates = 0;
    count.print = function () {
        console.log('Scraped Listings: ' + uids.scraped.length);
        console.log('Inserted Rows: ' + count.inserts);
        console.log('Duplicates Found: ' + count.duplicates);
        console.log(Array(20).join('+='));
    }

    if (uids.scraped.length === 0) {
        console.log('No listings were found in this county');
        writeToDBDeferred.resolve(false);
        return writeToDBDeferred.promise;
    }

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
        console.log('Result! ID #' + result.case_id);
        uids.present.push(result.case_id);
    });

    query.on('error', function(err) {
        console.log('Database stream error!');
        throw err;
    });

    query.on('end', function() {
        uids.absent = _.difference(uids.scraped, uids.present);

        var deferred = Q.defer();
        var loop = 0;

        if (uids.absent.length ==  0) {
            console.log('No new results were scraped');
            deferred.resolve(true);
        } else {
            console.log('Fetched all results!');
            console.log(uids.scraped.length + ' listings were scraped.');
            console.log('Commencing DB inserts for following listings, which were not found in our DB.');
            console.log(uids.absent.join(', '));

            uids.absent.forEach(function(absentUid) {
                var absentForeclosure = listings[absentUid];

                if (!absentForeclosure) {
                    loop++;
                    if (loop == uids.absent.length) {
                        loop++;
                        if (loop == uids.absent.length) deferred.resolve(true);
                        return;
                    }
                }

                // elminate double spaces
                var body = absentForeclosure.body;
                var body_parts  = body.trim().split(/\s+/);
                body = body_parts.join(" ");

                var insertMap = {};
                insertMap["body"] = body;

                // ensure that this foreclosures doesn't already exist
                // in the database, and if it does, return
                var sqlFindDuplicates = squel
                    .select({replaceSingleQuotes: true})
                    .from(table)
                    .where("body LIKE ?", insertMap["body"])
                    .toString();

                sql.promise(sqlFindDuplicates).then(function(duplicates) {
                    if (!util.isPresent(duplicates[0])) {
                        insertMap["case_id"] = parseInt(absentForeclosure.caseId);
                        insertMap["county"] = absentForeclosure.county;
                        insertMap["source"] = absentForeclosure.source;
                        insertMap["pub_date"] = moment(
                                absentForeclosure.pubDate, 'MM-DD-YYYY'
                                ).format('YYYY-MM-DD');

                        insertMap = _.merge(insertMap, parseAddress(body),
                                parseOwners(body), parseAttorneys(body),
                                parseSaleDate(body), parseBank(body));

                        var sqlInsertListing = squel
                            .insert({replaceSingleQuotes: true})
                            .into(table)
                            .setFields(insertMap)
                            .toString();

                        return sql.promise(sqlInsertListing);
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
        }

        deferred.promise.then(function() {
            count.print();
            writeToDBDeferred.resolve(true)
        }, function(err) {
            throw err;
        });
    });

    return writeToDBDeferred.promise;
}
