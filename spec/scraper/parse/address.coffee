parseAddress = require './../../../scraper/parseAddress'
stubbedListings = require './../stubbedListings'

describe "scraper.parseAddress", ->
    it "should successfully scrape `city` from listing bodies", ->
        for listing in stubbedListings
            result = parseAddress listing.body
            expect(result.city).toBe listing.city
            expect(result.street_addr).toBe listing.address
            expect(result.zip).toBe listing.zip

    it "should successfully scrape `street_addr` from listing bodies", ->
        for listing in stubbedListings
            result = parseAddress listing.body
            expect(result.street_addr).toBe listing.address

    it "should successfully scrape `zip` from listing bodies", ->
        for listing in stubbedListings
            result = parseAddress listing.body
            expect(result.zip).toBe listing.zip
