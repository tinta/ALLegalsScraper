// Libs
var Nightmare = require('nightmare');
var _ = require('lodash');
var moment = require('moment');

// Instantiations
var db = require('./../db-connect.js')();
var page = new Nightmare();

var options = {};
options.state = 'AL';
options.county = 'madison';
// var hudScraper = require('./hudScraper.js')(options);

// console.log('Scraping ' + hudScraper.url)

function encase (casing, text) {
    return casing + text + casing;
}

function encaseInQuotes (text) {
    return encase('"', text);
}

function encaseInTicks (text) {
    return encase('`', text);
}

var foreclosures = {};
var startDate = moment().add(-7, 'day').format('MM-DD-YYYY');
var endDate = moment().add(7, 'day').format('MM-DD-YYYY');
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
            var body, isForeclosure;
            if (res.DATA) {
                body = res.DATA.BODY[0];
                isForeclosure = body.toLowerCase().indexOf('foreclosure') > -1;
                if (isForeclosure) {
                    foreclosures[postOptions.data.id] = defineForeclosure(res);
                }
            }
        };

        function defineForeclosure (res) {
            var foreclosure = {};
            var body = res.DATA.BODY
                .join(' || ')
                .replace('\n', ' ');
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
        var tableName = 'foreclosures';

        var uids = {};
        uids.scraped = _.keys(scrapedForeclosures);
        uids.present = [];
        uids.absent = [];
        uids.sql = uids.scraped.join(', ');
        console.log(uids.scraped);
        console.log(scrapedForeclosures)

        var SQLFindListing = [
            'SELECT *',
            'FROM',
            tableName,
            'WHERE',
            'case_id',
            'IN',
            '(', uids.sql, ')'
        ].join(' ');

        var query = db.query(SQLFindListing);

        query.on('result', function(result) {
            uids.present.push(result.propertyCase);

            console.log('already exists')
            console.log(result)
        });

        query.on('end', function() {
            var insertedRows = 0;
            console.log('END')
            uids.absent = _.difference(uids.scraped, uids.present);

            if (uids.absent.length > 0) {
                _.each(uids.absent, function(absentUid) {
                    var absentForeclosure = scrapedForeclosures[absentUid];
                    console.log(absentForeclosure)
                    var insertKeysList, insertValuesList, SQLInsertListing;
                    var pubDate = moment(absentForeclosure.pubDate, 'MM-DD-YYYY').format('YYYY-MM-DD');

                    insertKeysList = [
                        // Not null
                        encaseInTicks('case_id'),
                        encaseInTicks('county'),
                        encaseInTicks('body'),
                        encaseInTicks('source'),
                        encaseInTicks('pub_date'),
                        // Optional
                        // encaseInTicks('street_addr'),
                        // encaseInTicks('city'),
                        // encaseInTicks('sale_location'),
                        // encaseInTicks('sale_date'),
                        // encaseInTicks('zip'),
                        // encaseInTicks('price'),
                        // encaseInTicks('bed')
                        // encaseInTicks('bath')
                    ].join(', ')

                    insertValuesList = [
                        encaseInQuotes(absentForeclosure.caseId),
                        encaseInQuotes(absentForeclosure.county),
                        encaseInQuotes(absentForeclosure.body),
                        encaseInQuotes(absentForeclosure.source),
                        encaseInQuotes(pubDate)
                    ].join(', ');

                    console.log(insertValuesList)

                    SQLInsertListing = [
                        'INSERT',
                        'INTO',
                        tableName,
                        '(', insertKeysList, ')',
                        'VALUES',
                        '(', insertValuesList, ')'
                    ].join(' ');

                    db.query(SQLInsertListing, function(err, foo) {
                        if (err) {
                            console.log(err)
                            db.end();
                            return;
                        }

                        insertedRows++;

                        console.log('success!')
                        console.log(foo)

                        if (uids.absent.length === insertedRows) {
                            console.log(foreclosures)
                            db.end();
                            console.log('WOOOOOOOOOO=----')
                        }
                    });
                });
            }
        });


    })
    .run();