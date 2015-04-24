// Libs
var Nightmare = require('nightmare');
var _ = require('lodash');
var moment = require('moment');

// Instantiations
var db = require('./../db-connect.js')();
var util = require('./../util.js');

var page = new Nightmare();

var options = {};
options.state = 'AL';
options.county = 'madison';

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
        });

        query.on('end', function() {
            var insertedRows = 0;
            uids.absent = _.difference(uids.scraped, uids.present);

            if (uids.absent.length > 0) {
                uids.absent.forEach(function(absentUid) {
                    var absentForeclosure = scrapedForeclosures[absentUid];
                    var insertKeysList, insertValuesList, SQLInsertListing;
                    var pubDate = moment(absentForeclosure.pubDate, 'MM-DD-YYYY').format('YYYY-MM-DD');

                    insertKeysList = [
                        // Cannot be `null`
                        util.encaseInTicks('case_id'),
                        util.encaseInTicks('county'),
                        util.encaseInTicks('body'),
                        util.encaseInTicks('source'),
                        util.encaseInTicks('pub_date'),
                        // Optional
                        // util.encaseInTicks('street_addr'),
                        // util.encaseInTicks('city'),
                        // util.encaseInTicks('sale_location'),
                        // util.encaseInTicks('sale_date'),
                        // util.encaseInTicks('zip'),
                        // util.encaseInTicks('price'),
                        // util.encaseInTicks('bed')
                        // util.encaseInTicks('bath')
                    ].join(', ')

                    insertValuesList = [
                        util.encaseInQuotes(absentForeclosure.caseId),
                        util.encaseInQuotes(absentForeclosure.county),
                        util.encaseInQuotes(absentForeclosure.body),
                        util.encaseInQuotes(absentForeclosure.source),
                        util.encaseInQuotes(pubDate)
                    ].join(', ');

                    SQLInsertListing = [
                        'INSERT',
                        'INTO',
                        tableName,
                        '(', insertKeysList, ')',
                        'VALUES',
                        '(', insertValuesList, ')'
                    ].join(' ');

                    db.query(SQLInsertListing, function(err) {
                        if (err) {
                            throw err;
                            db.end();
                            return;
                        }

                        insertedRows++;

                        if (uids.absent.length === insertedRows) {
                            db.end();
                            console.log('WOOOOOOOOOO!')
                        }
                    });
                });
            }
        });
    })
    .run();