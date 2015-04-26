// Libs
var Nightmare = require('nightmare');
var _ = require('lodash');
var moment = require('moment');
var squel = require("squel").useFlavour('mysql');

// Instantiations
var db = require('./../db-connect.js')();
var util = require('./../util.js');

db.on('error', function(err) {
    throw err;
});

// Scrapers
var scrapeSaleDate = require('./scrapeSaleDate.js');

var page = new Nightmare();

var options = {};
options.state = 'AL';
options.county = 'madison';

var table = "foreclosures";
var listings = {};

var startDate = moment().add(-28, 'day').format('MM-DD-YYYY');
var endDate = moment().add(14, 'day').format('MM-DD-YYYY');
var scrapeUrl = 'http://www.alabamalegals.com/index.cfm?fuseaction=home';
var counties = [
    56, // blount
    60, // colbert
    57, // cullman
    65, // deKalb
    59, // franklin
    66, // jackson
    1,  // jefferson
    4,  // lauderdale
    61, // lawrence
    67, // limestone
    5,  // madison
    63, // marshall
    62, // morgan
];

scrapeCounty(0);

function scrapeCounty (index) {
    var county = counties[index];
    console.log('Scraping county #' + county)
    page.goto(scrapeUrl)
        .wait(100)
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
        }, function(scrapedForeclosures) {
            console.log(scrapedForeclosures)
            console.log(Object.keys(scrapedForeclosures).length)

            writeToDB(scrapedForeclosures);

        })
        .run(function(err) {
            if (counties[index + 1]) {
                console.log(index)
                scrapeCounty(index + 1);
            } else {
                db.end();
            }
        });
}

function writeToDB (listings) {
    var uids = {};
    uids.scraped = _.keys(listings);
    uids.present = [];
    uids.absent = [];
    uids.sql = [];
    var SQLFindListing, query;

    if (uids.scraped.length > 0) {
        uids.scraped.forEach(function(uid, index) {
            uids.scraped[index] = db.escape(parseInt(uid));
            uids.sql.push('case_id = ' + uids.scraped[index]);
        });

        console.log('scraped')
        console.log(uids.scraped)

        SQLFindListing = squel.select().from(table).where(uids.sql.join(" OR ")).toString();
        console.log(SQLFindListing)
        query = db.query(SQLFindListing);

        query.on('result', function(result) {
            if (result.case_id == 1388618) { console.log('WTF')}
            uids.present.push(result.case_id);
        });

        query.on('end', function() {
            var insertedRows = 0;
            uids.absent = _.difference(uids.scraped, uids.present);

            if (uids.absent.length > 0) {
                uids.absent.forEach(function(absentUid) {
                    var absentForeclosure = listings[absentUid];
                    if (absentForeclosure) {
                        var pubDate = moment(absentForeclosure.pubDate, 'MM-DD-YYYY').format('YYYY-MM-DD');
                        var saleDate = scrapeSaleDate(absentForeclosure.body);
                        var addrRe = /(?:for\sinformational\spurposes.*\:|property is commonly known as)\s?(.*?)\,\s*(.*?)\,\s*(?:Alabama|AL)\s*(3\d{4})/ig;
                        var addressParts = addrRe.exec(absentForeclosure.body);
                        var city, streetAddr, zip;

                        var insertMap = {};
                        insertMap["case_id"] = parseInt(absentForeclosure.caseId);
                        insertMap["county"] = absentForeclosure.county;
                        insertMap["body"] = (absentForeclosure.body.length > 10000) ? absentForeclosure.body.substring(0,10000) : absentForeclosure.body;
                        insertMap["source"] = absentForeclosure.source;
                        insertMap["pub_date"] = pubDate;
                        insertMap["sale_date"] = saleDate;


                        if ((addressParts != null) && (addressParts.length === 4)) {
                            streetAddr = addressParts[1];
                            city = addressParts[2];
                            insertMap["zip"] = addressParts[3];

                            if (streetAddr.length > 63) streetAddr = streetAddr.substring(0,63);
                            if (city.length > 63) city = city.substring(0,63);

                            insertMap["city"] = city;
                            insertMap["street_addr"] = streetAddr;
                        }

                        // Optional
                        // util.encaseInTicks('street_addr'),
                        // util.encaseInTicks('city'),
                        // util.encaseInTicks('sale_location'),
                        // util.encaseInTicks('sale_date'),
                        // util.encaseInTicks('zip'),
                        // util.encaseInTicks('price'),
                        // util.encaseInTicks('bed')
                        // util.encaseInTicks('bath')

                        SQLInsertListing = squel.insert({replaceSingleQuotes: true}).into(table).setFields(insertMap).toString();

                        db.query(SQLInsertListing, function(err) {
                            if (err) {
                                db.end();
                                throw err;
                            }

                            insertedRows++;
                        });
                    } else {
                        console.log(absentUid)
                    }
                });
            }
        });
    }
}