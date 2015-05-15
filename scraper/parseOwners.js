var _ = require('lodash');

var regexes = [
    // that certain mortgage executed by J. Gary Monygomery, a married man, and  Mary Mae, 
    /mortgages?(?: dated .*?,)? executed(?: on .*)? by (.*?),? (?:a|an) (?:married|unmarried|single) (?:man|woman|person),? and (.*?),? (?:a|an) (?:unmarried|married|single) (?:man|woman|person)/i,
    /mortgages?(?: dated .*?,)? executed(?: on .*)? by (.*?),? (?:married|unmarried) and (?:wife, |husband, )?(.*?),? (?:married|unmarried)/i,
    // that certain mortgage executed by Mary Lou McCrite and Paul E. McCrite, wife and husband,
    /mortgages?(?: dated .*?,)? executed(?: on .*)? by (.*?),? and (.*?),? (?:husband and wife|wife and husband|married)/i,
    // that certain mortgage executed by Mary Lou McCrite and Paul E. McCrite, wife and husband,
    / mortgages?(?: dated .*?,)? executed(?: on .*)? by (.*?),? (?:husband and wife|wife and husband|married),? (.*?), /i,
    // that certain mortgage executed by J. Gary Monygomery and Mary
    /mortgages?(?: dated .*?,)? executed(?: on .*)? by (.*?),? and (?:wife|spouse|husband|married),? (.*?),? to/i,
    // that certain mortgage executed by Jannette A. Walker, unmarried and Maurice Bland, married,
    /mortgages>(?: dated .*?,)? executed(?: on .*)? by (.*?),? (?:married|unmarried) and (.*?),? (?:married|unmarried)/i,
    // that certain mortgage executed by Dorothy Ahonen A/K/A Dorothy Jean Hill, unmarried to
    // that certain mortgage executed by J. Gary Monygomery, a single man.
    // that certain mortgage executed by Celestine Pompey, to Wells Fargo Financial 
    /mortgages?(?: dated .*?,)? executed(?: on .*)? by (.*?),? (?:a|to|originally|unmarried|in|on|single)/i
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
