address = require './../../../scraper/parseAddress'
stubbedListings = require './../stubbedListings'

describe "scraper.parseAddress", ->
    it "should successfully scrape `city`, `street_addr` and `zip` from listing bodies", ->
        for listing in stubbedListings
            result = address listing.body
            expect(result.city).toBe listing.city
            expect(result.street_addr).toBe listing.address
            expect(result.zip).toBe listing.zip