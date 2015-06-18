parseSaleDate = require './../../../scraper/parseSaleDate'
stubbedListings = require './../stubbedListings'

describe "scraper.parseSaleDate", ->
    it "should successfully scrape `sale_date` from listing bodies", ->
        for listing in stubbedListings
            result = parseSaleDate listing.body
            expect(result.sale_date).toBe listing.sale_date