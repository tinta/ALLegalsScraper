scrapeAddress = require './../../../scraper/scrapers/scrapeAddress'
stubbedListings = require './../stubbedListings'

describe "scraper.scrapeAddress", ->
    it "should successfully scrape `city` from listing bodies", ->
        for listing, index in stubbedListings
            result = scrapeAddress listing.body
            expect(result.city).toBe listing.city, index

    it "should successfully scrape `street_addr` from listing bodies", ->
        for listing, index in stubbedListings
            result = scrapeAddress listing.body
            expect(result.street_addr).toBe listing.address, index

    it "should successfully scrape `zip` from listing bodies", ->
        for listing, index in stubbedListings
            result = scrapeAddress listing.body
            expect(result.zip).toBe listing.zip, index
