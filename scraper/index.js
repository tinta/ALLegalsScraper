/* global $ */
/* eslint no-console: 0 */

// Libs
var Xvfb = require('xvfb')
var Nightmare = require('nightmare')
var _ = require('lodash')
var moment = require('moment')
var squel = require('squel').useFlavour('mysql')

// Custom scripts
var db = require('./../common/db-connect.js')()
var util = require('./../common/util.js')
var sql = require('./../common/sql.js')
var parseSaleDate = require('./scrapers/scrapeSaleDate.js')
var parseAddress = require('./scrapers/scrapeAddress.js')
var parseOwners = require('./scrapers/scrapeOwners.js')
var parseAttorneys = require('./scrapers/scrapeAttorneys.js')
var parseBank = require('./scrapers/scrapeBank.js')
var countyIDs = require('./constants/countyIDs.js')

const DB_TABLE = 'foreclosures'
const SCRAPE_URL = 'https://www.alabamapublicnotices.com/'
const foreclosureSearchText = 'real+estate  foreclosure  foreclosed  foreclose  judicial+sale  notice+of+sale  forfeiture  forfeit'
const countySelectorIdPrefix = '#ctl00_ContentPlaceHolder1_as1_lstCounty_'
const searchBoxInputId = '#ctl00_ContentPlaceHolder1_as1_txtSearch'
const searchButtonId = '#ctl00_ContentPlaceHolder1_as1_btnGo'
const countyFilterId = '#ctl00_ContentPlaceHolder1_as1_divCounty'
const searchTypeSelector = '#ctl00_ContentPlaceHolder1_as1_rdoType_1'


const oneSecondInMS = 1000
const oneMinuteInMS = 60 * oneSecondInMS
// Initializations
const page = new Nightmare({
    show: false,
    executionTimeout: oneMinuteInMS * 10
})

const foo = [47, 51]
const scrapeCounties = (counties) => {
    const xvfb = new Xvfb({
        silent: true
    })
    xvfb.startSync()

    const scrapedCounties = counties.reduce(
        (acc, countyID) => (
            acc.then(() =>
                scrapeCounty(countyID)
                    .then((foreclosures) => writeToDB(foreclosures))
            )

        ), Promise.resolve([])
    )
    scrapedCounties.then(() => {
        console.log('Finished scraping.')
        db.end()
        page.end()
        xvfb.stopSync()
    })
}

scrapeCounties(foo)

function scrapeCounty(countyID) {
    console.log('Scraping county: ' + countyID)
    return page
        .on('console', (log, msg) => {
            console.log(msg)
        })
        .goto(SCRAPE_URL)
        .type(searchBoxInputId, foreclosureSearchText)
        .click(searchTypeSelector)
        .click(countyFilterId)
        .click(countySelectorIdPrefix + countyID)
        .wait(oneSecondInMS)
        .click(searchButtonId)
        /* a better solution waits for elem to load,
           but the html source doesn't change much after the page load :(
           just the css changes (e.g. hidden: true)
        */
        .wait(oneSecondInMS * 6)
        .select('.select-page', '50') // change this to 5 for debugging
        .wait(oneSecondInMS)
        .evaluate(function() {
            var foreclosures = {}
            var $tables = $('table.nested')
            console.log($tables.length + ' entries were found.')
            $tables.each(function(i, table) {
                var foreclosure = {}
                var text = table.innerText.split('\n')
                foreclosure.pubDate = text[1].match(', (.*)City')[1].trim() // Wednesday, January 17, 2018City: Birmingham
                var oneWeekAgo = new Date()
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 2)
                if (new Date(foreclosure.pubDate) < oneWeekAgo) return null
                // javascript:location.href='Details.aspx?SID=dw44xhammmz1uuoskx0odpgv&ID=1830441';return false;
                foreclosure.link = (table.rows[0].cells[0].children[0].onclick + '')
                    .split('href=\'')[1]
                    .split('\';return')[0]
                foreclosure.caseId = foreclosure.link.split('&ID=')[1]
                foreclosure.county = text[2].match(': (.*)')[1].trim() // County: Jefferson
                foreclosure.source = text[0].trim() //    Alabama Messenger
                $.ajax({
                    url: 'https://www.alabamapublicnotices.com/' + foreclosure.link,
                    type: 'GET',
                    async: false,
                    cache: false,
                    timeout: 30000,
                    complete: function(data) {
                        foreclosure.body = $(data.responseText)
                            .find('#ctl00_ContentPlaceHolder1_PublicNoticeDetailsBody1_lblContentText')
                            .text().trim()
                        foreclosures[foreclosure.caseId] = foreclosure
                    }
                })
            })
            return foreclosures
        })
        .then((foreclosures) => {
            console.log('Scraping from target site complete.')
            console.log(JSON.stringify(foreclosures))
            return Promise.resolve(foreclosures)              
        }, (error) => {
            console.log('Scraping error:')
            console.log(error)
            return Promise.reject()
        })
}

const writeToDB = (listings) => new Promise((resolve) => {
    var uids = {}
    uids.scraped = Object.keys(listings)
    uids.present = []
    uids.absent = []
    uids.sql = []
    var sqlFindListing, query

    console.log(Array(50).join('=+'))

    var count = {}
    count.inserts = 0
    count.duplicates = 0
    count.print = function() {
        console.log('Scraped Listings: ' + uids.scraped.length)
        console.log('Inserted Rows: ' + count.inserts)
        console.log('Duplicates Found: ' + count.duplicates)
        console.log(Array(20).join('+='))
    }

    if (uids.scraped.length === 0) {
        console.log('No listings were found in this county')
        return resolve(false)
    }

    uids.scraped.forEach(function(uid, index) {
        uids.scraped[index] = db.escape(parseInt(uid))
        uids.sql.push('case_id = ' + uids.scraped[index])
    })

    sqlFindListing = squel
        .select()
        .from(DB_TABLE)
        .where(uids.sql.join(' OR '))
        .toString()

    query = db.query(sqlFindListing)


    query.on('result', function(result) {
        console.log('Result! ID #' + result.case_id)
        uids.present.push(result.case_id)
    })

    query.on('error', function(err) {
        console.log('Database stream error!')
        throw err
    })

    query.on('end', function() {
        uids.absent = _.difference(uids.scraped, uids.present)

        let promise

        if (uids.absent.length == 0) {
            console.log('No new results were scraped')
            promise = Promise.resolve(true)
        } else {
            console.log('Fetched all results!')
            console.log(uids.scraped.length + ' listings were scraped.')
            console.log('Commencing DB inserts for following ' + uids.absent.length + ' listings, which were not found in our DB.')
            console.log(uids.absent.join(', '))

            promise = uids.absent.reduce((acc, absentID) => acc.then(() => {
                console.log('Commencing insertion for Foreclosure #' + absentID)
                var absentForeclosure = listings[absentID]

                // elminate double spaces
                var body = absentForeclosure.body
                var body_parts = body.trim().split(/\s+/)
                body = body_parts.join(' ')

                var insertMap = {}
                insertMap['body'] = body

                // ensure that this foreclosure doesn't already exist
                //  in the database, and if it does, return the found entries
                var sqlFindDuplicates = squel
                    .select({
                        replaceSingleQuotes: true
                    })
                    .from(DB_TABLE)
                    .where('body LIKE ?', insertMap['body'])
                    .toString()

                return sql.promise(sqlFindDuplicates)
                    .then(function(duplicates) {
                        const duplicatesFound = util.isPresent(duplicates[0])
                        if (duplicatesFound) {
                            console.log('Duplicate Found - Foreclosure #' + absentID)
                            count.duplicates += 1
                            return Promise.resolve(false)
                        }

                        insertMap['case_id'] = parseInt(absentForeclosure.caseId)
                        insertMap['county'] = absentForeclosure.county
                        insertMap['source'] = absentForeclosure.source
                        insertMap['pub_date'] = moment(
                            absentForeclosure.pubDate, 'MM-DD-YYYY'
                        ).format('YYYY-MM-DD')

                        insertMap = _.merge(insertMap, parseAddress(body),
                            parseOwners(body), parseAttorneys(body),
                            parseSaleDate(body), parseBank(body))

                        var sqlInsertListing = squel
                            .insert({
                                replaceSingleQuotes: true
                            })
                            .into(DB_TABLE)
                            .setFields(insertMap)
                            .toString()

                        return sql.promise(sqlInsertListing)
                    })
                    .then((insertedRow) => {
                        if (insertedRow) {
                            console.log('Finished inserting Foreclosure #' + absentID)
                            count.inserts++
                        }
                        return Promise.resolve()
                    }, (error) => {
                        console.log(error)
                        console.log(absentForeclosure)
                        return Promise.reject()
                    })
            }), Promise.resolve(true))
        }

        promise.then(() => {
            count.print()
            resolve(true)
        }, (err) => {
            throw err
        })
    })
})
