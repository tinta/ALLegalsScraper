var _ = require('lodash');
var regexes = [
    // executed on the 03/14/2008, by MARVIN HOLDEN, MARRIED MAN AND WIFE, DARLENE HOLDEN, as Mortgagor
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?: on .*)? (?:by|from) (.*?),? (?:married man and wife),?\s(.*?),\s/i,

    // that certain mortgage executed by J. Gary Monygomery, a married man, and  Mary Mae,
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?: on .*)? (?:by|from) (.*?),? (?:a|an) (?:married|unmarried|single) (?:man|woman|person),? and (.*?),? (?:a|an) (?:unmarried|married|single) (?:man|woman|person)/i,
    // /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?: on .*)? (?:by|from) (.*?),? (?:married|unmarried) and (?:wife,\s|husband,\s)?(.*?),? (?:married|unmarried)/i,

    // that certain mortgage executed by Mary Lou McCrite and Paul E. McCrite, wife and husband,
    // executed on the 05/18/2007, by BILLY C. HUMPHREY AND STEPHANIE S. HUMPHREY, A MARRIED MAN AND WOMAN
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?: on .*)? (?:by|from) (.*?),? and (.*?),? (?:husband and wife|wife and husband|a?\smarried)/i,
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?: on .*)? (?:by|from) (.*?),? (?:a|an) (?:married|unmarried|single) (?:man|woman|person),?/i,

    // from Michael G. Jones and wife, Janice T. Jones in favor of The Bank dated
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?: on .*)? (?:by|from)\s(.*?),?\s(?:and\swife),?\s(.*?)\s?(?:,|in\sfavor)\s/i,

    // that certain mortgage executed by Mary Lou McCrite and Paul E. McCrite, wife and husband,
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?: on .*)? (?:by|from) (.*?),? (?:husband and wife|wife and husband|married),? (.*?), /i,

    // that certain mortgage executed by J. Gary Monygomery and Mary
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?: on .*)? (?:by|from) (.*?),? and (?:wife|spouse|husband|married),? (.*?),? to/i,

    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?: on .*)? (?:by|from) (.*?),? and (.*?),?\s?(?:and|to)/i,

    // that certain mortgage executed by Jannette A. Walker, unmarried and Maurice Bland, married,
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?: on .*)? (?:by|from) (.*?),? (?:married|unmarried) and (.*?),? (?:married|unmarried)/i,

    // that certain mortgage executed by Dorothy Ahonen A/K/A Dorothy Jean Hill, unmarried to
    // that certain mortgage executed by J. Gary Monygomery, a single man.
    // that certain mortgage executed by Celestine Pompey, to Wells Fargo Financial
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?: on .*)? (?:by|from) (.*?),? (?:a|to|originally|unmarried|in|on|single)/i
];

function parseOwner (text) {
    text = text.substring(0,350);
    var owners = {};
    //console.log(text.substring(0,300));
    for (var i = 0; i < regexes.length; i++) {
        var matches = text.match(regexes[i]);
        if (matches !== null && matches.length >= 2) {
            owners["name1"] = matches[1];
            if (matches.length === 3) 
                owners["name2"] = matches[2];
            //owners["match"] = i;
            break
        }
    }
    return owners
}

module.exports = parseOwner;
