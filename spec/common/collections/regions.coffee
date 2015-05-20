util = require './../../../common/util'
regions = require './../../../common/collections/regions'

class Test
    constructor: (@key, @val) ->

tests = [
    new Test 'foo', []
    new Test 'bar', ['car']
    new Test 'meow', ['woof', 'chirp']
]

describe "regions", ->
    beforeEach ->
        regions.all = {}
        for test in tests
            regions.set test.key, test.val

    it ".set() should succeed in setting a new key/val pair upon `regions.all`", ->
        for test in tests
            numOfKeys = Object
                .keys regions.all[test.key].counties
                .length
            expect numOfKeys
                .toBe test.val.length, "| test.key = #{test.key}"

    it ".contains(regionName) should return `true` if given `regionName` exists in `regions.all`", ->
        for test in tests
            expect regions.contains test.key
                .toBe true, "| test.key = #{test.key}"

    it ".setCurrent(regionName) should mark the supplied region's `isCurrent` property to `true`", ->
        for test in tests
            if test.val.length > 0
                toBeCurrentRegion = regions.all[test.key]
                actualCurrentRegion = regions.setCurrent toBeCurrentRegion.name

                expect toBeCurrentRegion.isCurrent
                    .toBe true, "| toBeCurrentRegion = #{toBeCurrentRegion}"

    it ".setCurrent(regionName) should return the `current` region", ->
        for test in tests
            if test.val.length > 0
                toBeCurrentRegion = regions.all[test.key]
                actualCurrentRegion = regions.setCurrent toBeCurrentRegion.name
                expect actualCurrentRegion
                    .toEqual toBeCurrentRegion

    it ".setCurrent(regionName) should mark all other region's `isCurrent` property to `false`", ->
        for test in tests
            if test.val.length > 0
                currentRegion = regions.setCurrent test.key

                # remove key/val pair from object to simplify looping over non-current regions in following test
                delete regions.all[test.key]

                for regionName, regionData of regions.all
                    expect regionData.isCurrent
                    .toBe false, "| regionName = #{regionName}"