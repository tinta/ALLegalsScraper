util = require './../../../common/util'

tests = {}
tests.true = [
    true
    false
    NaN
    ''
    'a'
    'abc'
    'undefined'
    'null'
    1
    123
    0.123
    {}
    {foo:123}
    []
    [0]
]

tests.false = [
    undefined
    null
]

describe "util.isDefined", ->
    it "should return `true` for values that are defined", ->
        for test in tests.true
            result = util.isDefined test
            console.log result
            expect(result).toBe true

    it "should return `false` for values that are not defined", ->
        for test in tests.false
            result = util.isDefined test
            console.log result
            expect(result).toBe false