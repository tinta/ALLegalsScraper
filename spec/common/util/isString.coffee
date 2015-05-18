util = require './../../../common/util'

tests = {}
tests.true = [
    ''
    'a'
    'abc'
    'undefined'
    'false'
]

tests.false = [
    undefined
    null
    true
    false
    NaN
    Infinity
    {}
    []
]

describe "util.isString", ->
    it "should return `true` for values that are strings", ->
        for test in tests.true
            result = util.isString test
            expect(result).toBe true

    it "should return `false` for values that are not strings", ->
        for test in tests.false
            result = util.isString test
            expect(result).toBe false