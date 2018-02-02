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
var parseAddress = require('./scrapers/scrapeAddress.js');
var parseOwners = require('./scrapers/scrapeOwners.js');
var parseAttorneys = require('./scrapers/scrapeAttorneys.js');
var parseBank = require('./scrapers/scrapeBank.js');
var countyIDs = require('./constants/countyIDs.js')

// Initializations
const page = new Nightmare({
    show: false,
    executionTimeout: 60 * 5 * 1000
});

var table = "foreclosures";
var startDate = moment().add(-1, 'day').format('MM-DD-YYYY');
var endDate = moment().add(0, 'day').format('MM-DD-YYYY');
const scrapeUrl = "https://www.alabamapublicnotices.com/";
const foreclosureSearchText = "real+estate  foreclosure  foreclosed  foreclose  judicial+sale  notice+of+sale  forfeiture  forfeit";
const countySelectorIdPrefix = "#ctl00_ContentPlaceHolder1_as1_lstCounty_";
const searchBoxInputId = "#ctl00_ContentPlaceHolder1_as1_txtSearch";
const searchButtonId = "#ctl00_ContentPlaceHolder1_as1_btnGo";
const countyFilterId = "#ctl00_ContentPlaceHolder1_as1_divCounty";
const searchTypeSelector = "#ctl00_ContentPlaceHolder1_as1_rdoType_1";

const foo = [24, 35]
const scrapeCounties = (counties) => {
    const scrapedCounties = counties.reduce(
        (fn, countyID) => fn.then(() => {
            scrapeCounty(countyID)
        }), Q()
    )
    scrapedCounties.then(() => {
        console.log("Finished scraping.")
        db.end()
    })
}

scrapeCounties(foo)
// scrapeCounty(0);

function scrapeCounty(countyID) {
    const xvfb = new Xvfb({
        silent: true
    });
    xvfb.startSync();
    console.log("Scraping county: " + countyID);
    return page
        .goto(scrapeUrl)
        .type(searchBoxInputId, foreclosureSearchText)
        .click(searchTypeSelector)
        .click(countyFilterId)
        .click(countySelectorIdPrefix + countyID)
        .wait(1000)
        .click(searchButtonId)
        /* a better solution waits for elem to load,
           but the html source doesn't change much after the page load :(
           just the css changes (e.g. hidden: true)
        */
        .wait(6000)
        .select(".select-page", "50") // change this to 5 for debugging
        .wait(1000)
        .evaluate(function(SCRAPE_URL) {
            var foreclosures = {};
            var $tables = $("table.nested");
            $tables.each(function(i, table) {
                var foreclosure = {};
                var text = table.innerText.split("\n");
                // javascript:location.href='Details.aspx?SID=dw44xhammmz1uuoskx0odpgv&ID=1830441';return false;
                foreclosure.link = (table.rows[0].cells[0].children[0].onclick + '')
                    .split("href='")[1]
                    .split("';return")[0];
                foreclosure.caseId = foreclosure.link.split("&ID=")[1];
                foreclosure.county = text[2].match(": (.*)")[1].trim(); // County: Jefferson
                foreclosure.pubDate = text[1].match(", (.*)City")[1].trim(); // Wednesday, January 17, 2018City: Birmingham
                foreclosure.source = text[0].trim(); //    Alabama Messenger
                // can't call scrapeUrl because it's out of scope :(
                $.ajax({
                    url: SCRAPE_URL + foreclosure.link,
                    type: 'GET',
                    async: false,
                    cache: false,
                    timeout: 30000,
                }).then(function(data, code) {
                    foreclosure.body = $(data.responseText)
                        .find("#ctl00_ContentPlaceHolder1_PublicNoticeDetailsBody1_lblContentText")
                        .text().trim();

                    foreclosures[foreclosure.caseId] = foreclosure;
                }, function() {
                    foreclosures[foreclosure.caseId] = null
                })
            });
            return foreclosures;
        }, scrapeURL)
        .end()
}

function writeToDB(listings) {
    var writeToDBDeferred = Q.defer();
    var uids = {};
    uids.scraped = _.keys(listings.filter((listing) => listing));
    uids.present = [];
    uids.absent = [];
    uids.sql = [];
    var sqlFindListing, query;

    console.log(Array(50).join('=+'));

    var count = {};
    count.inserts = 0;
    count.duplicates = 0;
    count.print = function() {
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

        if (uids.absent.length == 0) {
            console.log('No new results were scraped');
            deferred.resolve(true);
        } else {
            console.log('Fetched all results!');
            console.log(uids.scraped.length + ' listings were scraped.');
            console.log('Commencing DB inserts for following ' + uids.absent.length + ' listings, which were not found in our DB.');
            console.log(uids.absent.join(', '));

            uids.absent.forEach(function(absentID) {
                console.log("Commencing insertion for Foreclosure #" + absentID);
                var absentForeclosure = listings[absentID];

                if (!absentForeclosure) {
                    console.log("Missing - Foreclosure #" + absentID + ' ' + loop);
                    loop++;
                    if (loop == uids.absent.length) {
                        loop++;
                        if (loop == uids.absent.length) deferred.resolve(true);
                        return;
                    }
                }

                // elminate double spaces
                var body = absentForeclosure.body;
                var body_parts = body.trim().split(/\s+/);
                body = body_parts.join(" ");

                var insertMap = {};
                insertMap["body"] = body;

                // ensure that this foreclosure doesn't already exist
                //  in the database, and if it does, return the found entries
                var sqlFindDuplicates = squel
                    .select({
                        replaceSingleQuotes: true
                    })
                    .from(table)
                    .where("body LIKE ?", insertMap["body"])
                    .toString();

                sql.promise(sqlFindDuplicates).then(function(duplicates) {
                        if (!util.isPresent(duplicates[0])) {
                            console.log("No Duplicates Found - Foreclosure #" + absentID + ' ' + loop);

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
                                .insert({
                                    replaceSingleQuotes: true
                                })
                                .into(table)
                                .setFields(insertMap)
                                .toString();

                            return sql.promise(sqlInsertListing);
                        }

                        console.log("Duplicate Found - Foreclosure #" + absentID + ' ' + loop);
                        count.duplicates += 1;
                        return Q(false);
                    })
                    .then(function(insertObj) {
                        if (insertObj) {
                            console.log("Finished inserting Foreclosure #" + absentID)
                            count.inserts++;
                        }
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
