util = require './../../../common/util'

class User
    constructor: (@name, @accountIsActive) ->

class UserExpect
    constructor: (@user, @expect) ->

tests = {}
tests.true = [
    new UserExpect(
        new User 'foo bar', 0
        new User 'foo', false
    )
    new UserExpect(
        new User 'foo bar', 1
        new User 'foo', true
    )
    new UserExpect(
        new User 'foobar', 1
        new User 'foobar', true
    )
]

describe "util.prepareUser", ->
    it "should prepare queried users for use in client side", ->
        for test in tests.true
            result = util.prepareUser test.user
            expect(result.firstName).toBe test.expect.name