var _ = require('lodash');
var regexes = [
     // executed by Thomas Sobczynski and his wife, Angela J. Sobczynski, in favor of Mortgage Electronic Registration Systems, Inc.
    /(?:executed by).?,? (.*?) (?:and his wife|and her husband),? (.*?),? (?:in favor of)/i,
    // executed on the 03/14/2008, by MARVIN HOLDEN, MARRIED MAN AND WIFE, DARLENE HOLDEN, as Mortgagor
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?:on|made by)?.*? (?:by|from) (.*?),? (?:married man and wife),?\s(.*?),\s/i,
    // that certain mortgage executed by J. Gary Monygomery, a married man, and  Mary Mae,
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?:on|made by)?.*? (?:by|from) (.*?),? (?:a|an) (?:married|unmarried|single) (?:man|woman|person),? and (.*?),? (?:a|an) (?:unmarried|married|single) (?:man|woman|person)/i,

    // that certain mortgage executed by Mary Lou McCrite and Paul E. McCrite, wife and husband,
    // executed on the 05/18/2007, by BILLY C. HUMPHREY AND STEPHANIE S. HUMPHREY, A MARRIED MAN AND WOMAN
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?:on|made by)?.*? (?:by|from) (.*?),? and (.*?),? (?:husband and wife|wife and husband|a?\smarried)/i,
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?:on|made by)?.*? (?:by|from) (.*?),? (?:a|an) (?:married|unmarried|single) (?:man|woman|person),?/i,

    // from Michael G. Jones and wife, Janice T. Jones in favor of The Bank dated
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?:on|made by)?.*? (?:by|from)\s(.*?),?\s(?:and\swife),?\s(.*?)\s?(?:,|in\sfavor)\s/i,

    // that certain mortgage executed by Mary Lou McCrite and Paul E. McCrite, wife and husband,
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?:on|made by)?.*? (?:by|from) (.*?),? (?:husband and wife|wife and husband|married),? (.*?), /i,

    // that certain mortgage executed by J. Gary Monygomery and Mary
    // that certain mortgage executed to Liberty Bank by STEVEN HENDERSON and spouse KATHERINE HENDERSON, which mortgage is date
    // that certain mortgage executed by David E. Craig, joined herein pro forma by spouse, Gloria F. Craig, originally
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?:on|made by)?.*? (?:by|from) (.*?),? and (.*?),? (?:and|to|which|on)/i,
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?:on|made by)?.*? (?:by|from) (.*?),? (?:and|joined) .*?(?:wife|spouse|husband|married),? (.*?)(?:, | and )/i,

    // that certain mortgage executed by Jannette A. Walker, unmarried and Maurice Bland, married,
    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?:on|made by)?.*? (?:by|from) (.*?),? (?:married|unmarried) and (.*?),? (?:married|unmarried)/i,

    // that certain mortgage executed by Dorothy Ahonen A/K/A Dorothy Jean Hill, unmarried to
    // that certain mortgage executed by J. Gary Monygomery, a single man.
    // that certain mortgage executed by Celestine Pompey, to Wells Fargo Financial

    /(?: dated .*?,)?\s(?:executed|certain Mortgage)(?:on|made by)?.*? (?:by|from) (.*?),? (?:a|to|originally|unmarried|in|on|single)/i
];

function parseOwner (text) {
    text = text.substring(0,350);
    var owners = {};
    for (var i = 0; i < regexes.length; i++) {
        var matches = text.match(regexes[i]);
        if (matches !== null && matches.length >= 2) {
            owners["name1"] = matches[1].slice(0, 30);
            if (matches.length === 3) 
                owners["name2"] = matches[2].slice(0, 30);
            return owners
        }
    }
}

module.exports = parseOwner;
