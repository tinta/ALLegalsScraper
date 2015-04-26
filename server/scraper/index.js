// Libs
var Nightmare = require('nightmare');
var _ = require('lodash');
var moment = require('moment');
var squel = require("squel").useFlavour('mysql');

// Instantiations
var db = require('./../db-connect.js')();
var util = require('./../util.js');

// Scrapers
var scrapeSaleDate = require('./scrapeSaleDate.js');

var page = new Nightmare();

var options = {};
options.state = 'AL';
options.county = 'madison';

var table = "foreclosures";
var foreclosures = {};
var startDate = moment().add(-1, 'day').format('MM-DD-YYYY');
var endDate = moment().add(1, 'day').format('MM-DD-YYYY');
var scrapeUrl = 'http://www.alabamalegals.com/index.cfm?fuseaction=home';

page.goto(scrapeUrl)
    .wait(100)
    .evaluate(function(startDate, endDate) {
        var els = {};
        els.$startDate = $('#from').val(startDate);
        els.$endDate = $('#to').val(endDate);
    }, function () {}, startDate, endDate)
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

        var uids = {};
        uids.scraped = _.keys(scrapedForeclosures);
        uids.present = [];
        uids.absent = [];
        uids.sql = [];
        uids.scraped.forEach(function(uid, index) {
            uids.scraped[index] = db.escape(parseInt(uid));
            uids.sql.push('case_id = ' + uids.scraped[index]);
        });

        var SQLFindListing = squel.select().from(table).where(uids.sql.join(" OR ")).toString();
        console.log("1. " + SQLFindListing);
        var query = db.query(SQLFindListing);

        query.on('result', function(result) {
            uids.present.push(result.case_id);
        });

        query.on('end', function() {
            var insertedRows = 0;
            uids.absent = _.difference(uids.scraped, uids.present);

            if (uids.absent.length > 0) {
                uids.absent.forEach(function(absentUid) {
                    var absentForeclosure = scrapedForeclosures[absentUid];
                    if (absentForeclosure) {
                        var pubDate = moment(absentForeclosure.pubDate, 'MM-DD-YYYY').format('YYYY-MM-DD');
                        var saleDate = scrapeSaleDate(absentForeclosure.body);
                        var addrRe = /(?:for\sinformational\spurposes.*\:|property is commonly known as)\s?(.*?)\,\s*(.*?)\,\s*(?:Alabama|AL)\s*(3\d{4})/ig;
                        var addressParts = addrRe.exec(absentForeclosure.body);

                        var insertMap = {};
                        insertMap["case_id"] = parseInt(absentForeclosure.caseId);
                        insertMap["county"] = absentForeclosure.county;
                        insertMap["body"] = absentForeclosure.body;
                        insertMap["source"] = absentForeclosure.source;
                        insertMap["pub_date"] = pubDate;
                        insertMap["sale_date"] = saleDate;

                        if ((addressParts != null) && (addressParts.length === 4)) {
                            insertMap["street_addr"] = addressParts[1];
                            insertMap["city"] = addressParts[2];
                            insertMap["zip"] = addressParts[3];
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
                        console.log("2. " + SQLInsertListing);
                        db.query(SQLInsertListing, function(err) {
                            if (err) {
                                db.end();
                                throw err;
                            }

                            insertedRows++;

                            if (uids.absent.length === insertedRows) {
                                db.end();
                                console.log('WOOOOOOOOOO!');
                            }
                        });
                    }
                });
            } else {
                db.end();
            }
        });
    })
    .run();
