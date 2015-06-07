util = require './../../../../common/util'
sql = require './../../../../common/sql'

class Test
    constructor: (@val, @expect) ->

tests = {}
tests.true = [
    new Test ['a'], 'county = \'a\''
    new Test ['a', 'b'], 'county = \'a\' OR county = \'b\''
    new Test [true, false], 'county = true OR county = false'
]

tests.throwError = [
    []
    1
    '1'
    Infinity
    true
    false
]

describe "sql.cast.counties", ->
    it "should prepare Array of counties for a Mysql query", ->
        for test in tests.true
            result = sql.cast.counties test.val
            expect(result).toBe test.expect

    it "should only accept a Present Array as valid fo first argument", ->
        for test in tests.throwError
            expect( ->
                sql.cast.counties test
            ).toThrow()