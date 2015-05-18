util = require './../../../common/util'

tests = {}
tests.true = [
    [0]
    0:0
    '0'
    0
    1
    0.1
    Infinity
    NaN
    'null'
    'false'
]

tests.false = [
    {}
    []
    ''
    true
    false
    undefined
    null
]

describe "util.isPresent", ->
    it "should return `true` for values that are present", ->
        for test in tests.true
            result = util.isPresent test
            expect(result).toBe true

    it "should return `false` for values that are not present", ->
        for test in tests.false
            result = util.isPresent test
            expect(result).toBe false