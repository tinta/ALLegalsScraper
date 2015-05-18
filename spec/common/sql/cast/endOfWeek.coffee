sql = require './../../../../common/sql'

class Test
    constructor: (@val, @expect) ->

satudayDate = '2015-05-23'
nextSatudayDate = '2015-05-30'

tests = {}
tests.valid = [
    # Sunday
    new Test '2015-05-17', satudayDate
    # Monday
    new Test '2015-05-18', satudayDate
    # Tuesday
    new Test '2015-05-19', satudayDate
    # Wednesday
    new Test '2015-05-20', satudayDate
    # Thursday
    new Test '2015-05-21', satudayDate
    # Friday
    # We want .endOfWeek to return NEXT Saturday if given a Friday
    new Test '2015-05-22', nextSatudayDate
    # Saturday
    new Test '2015-05-23', nextSatudayDate
]

describe "sql.cast.endOfWeek", ->
    it "should return a Mysql-formatted date that represents the most immediate future Saturday", ->
        for test in tests.valid
            result = sql.cast.endOfWeek test.val
            expect(result).toBe test.expect