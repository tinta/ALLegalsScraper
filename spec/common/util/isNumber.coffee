util = require './../../../common/util'

tests = {}
tests.true = [
    0
    1
    0.1
    Infinity
    -Infinity
    NaN
    '0'
    '1'
    '0.1'
    'Infinity'
    '-Infinity'
]

tests.false = [
    true
    false
    undefined
    {}
    []
]

describe "util.isNumber", ->
    it "should return `true` for values that are numbers", ->
        for test in tests.true
            result = util.isNumber test
            expect(result).toBe true

    it "should return `false` for values that are not numbers", ->
        for test in tests.false
            result = util.isNumber test
            expect(result).toBe false