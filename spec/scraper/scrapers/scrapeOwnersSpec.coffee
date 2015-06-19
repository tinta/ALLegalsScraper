scrapeOwners = require './../../../scraper/scrapers/scrapeOwners'
stubbedListings = require './../stubbedListings'

describe "scraper.scrapeOwners", ->
    it "should successfully scrape `name1` from listing bodies", ->
        for listing in stubbedListings
            result = scrapeOwners listing.body
            console.log('=====')
            console.log(listing.sale_date)
            console.log(result)
            expect(result.name1).toBe listing.name1

    it "should successfully scrape `name2` from listing bodies", ->
        for listing in stubbedListings
            result = scrapeOwners listing.body
            expect(result.name2).toBe listing.name2