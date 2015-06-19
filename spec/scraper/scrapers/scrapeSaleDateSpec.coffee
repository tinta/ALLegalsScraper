scrapeSaleDate = require './../../../scraper/scrapers/scrapeSaleDate'
stubbedListings = require './../stubbedListings'

describe "scraper.scrapeSaleDate", ->
    it "should successfully scrape `sale_date` from listing bodies", ->
        for listing in stubbedListings
            result = scrapeSaleDate listing.body
            expect(result.sale_date).toBe listing.sale_date