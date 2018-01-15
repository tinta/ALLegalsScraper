// Libs
var Xvfb = require('xvfb');
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
const page = new Nightmare({
  show: false,
});

var table = "foreclosures";
var startDate = moment().add(-1, 'day').format('MM-DD-YYYY');
var endDate = moment().add(0, 'day').format('MM-DD-YYYY');
var scrapeUrl = "https://www.alabamapublicnotices.com/";
const foreclosureSearchText = "real+estate  foreclosure  foreclosed  foreclose  judicial+sale  judgment  notice+of+sale  forfeiture  forfeit";
const countySelectorIdPrefix = "#ctl00_ContentPlaceHolder1_as1_lstCounty_";
const searchBoxInputId = "#ctl00_ContentPlaceHolder1_as1_txtSearch";
const searchButtonId = "#ctl00_ContentPlaceHolder1_as1_btnGo";
const countyFilterId= "#ctl00_ContentPlaceHolder1_as1_divCounty";
var counties = [
    // Northeast
    24, // deKalb
    35, // jackson
    41, // limestone
    44,  // madison
    47, // marshall
    51, // morgan

    // Northwest
    29, // franklin
    16, // colbert
    38,  // lauderdale
    39, // lawrence

    // Mid
    4, // blount
    21, // cullman
    36,  // jefferson
    57, // Shelby

    // Midwest
    63, // Tuscaloosa
    46, // Marion
    37,  // Lamar
    28, // Fayette
    67, // Winston
    64, // Walker
    53, // Pickens

    // Mideast
    9, // Cherokee
    27, // Etowah
    60, // Talladega
    7, // Calhoun
    13,  // Clay
    55, // Randolph
    14 // Cleburne
];

scrapeCounty(0);

function scrapeCounty (index) {
    var xvfb = new Xvfb({
      silent: true
    });
    xvfb.startSync();
    console.log("Scraping county: " + counties[index])
    page
        .goto(scrapeUrl)
        .type(searchBoxInputId, foreclosureSearchText)
        .click(countyFilterId)
        .click(countySelectorIdPrefix + counties[index])
        .wait(1000)
        .click(searchButtonId)
        /* a better solution waits for elem to load,
           but the html source doesn't change much after the page load :(
           just the css changes (e.g. hidden: true)
        */
        .wait(6000)
        .evaluate(function() {
            return document.querySelector(".criteria").innerText;
        })
        .end()
        .then(function(title) {
          console.log(title);
          xvfb.stopSync();
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
