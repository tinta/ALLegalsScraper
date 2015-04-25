var parse = {};

parse.date = {};

parse.date.months = 'January|February|March|April|May|June|July|August|September|October|November|December'

parse.date.strict = function (str) {
    var re1 = /(?:Alabama(?:\,)?(?:.{0,30})?\son\s)(.{0,30}\s20\d\d)/gi;
    var re2 = /(?:of\ssale(?:\,?\son\s(?:the\s)?)?)(.{0,30}\s20\d\d)|(\d\d\/\d\d\/\d\d)/gi;
    var re3 = /(?:sale\scontained\sin\sthe\ssaid\smortgage\swill\,\son\s)(.{0,30}\s20\d\d)/gi;
    var re4 = /(?:between\s11\:00\sA\.M\.\sand\s3\:00\sP\.M\.\son\s)(.{0,30}\s20\d\d)/gi;

    return (
        re1.exec(str) ||
        re2.exec(str) ||
        re3.exec(str) ||
        re4.exec(str)
    );
};

parse.date.postponed = function (str) {
    var re1 = /(?:The\sabove\smortgage\sforeclosure\ssale\shas\sbeen\spostponed\suntil\s)((January|February|March|April|May|June|July|August|September|October|November|December).{0,10}\s20\d\d)/gi;
    var re2 = /(?:The\sabove\smortgage\sforeclosure\ssale\shas\sbeen\spostponed\suntil\s)(\d\d\/\d\d\/20\d\d)/gi;
    var re3 = /(?:THIS\sFORECLOSURE\sSALE\sHAS\sBEEN\sCONTINUED\sTO\s)((January|February|March|April|May|June|July|August|September|October|November|December).{0,10}\s20\d\d)/gi;
    var re4 = /(?:THIS\sFORECLOSURE\sSALE\sHAS\sBEEN\sCONTINUED\sTO\s)(\d\d\/\d\d\/20\d\d)/gi;
    var re5 = /(?:THE\sREFERENCED\sFORECLOSURE\sSALE\sABOVE\sIS\sCONTINUED\sTO\s)((January|February|March|April|May|June|July|August|September|October|November|December).{0,10}\s20\d\d)/gi;

    return (
        re1.exec(str) ||
        re2.exec(str) ||
        re3.exec(str) ||
        re4.exec(str) ||
        re5.exec(str)
    );
};

var tally = {};
tally.failures = 0;
tally.postponed = 0;
tally.nonpostponed = 0;

listings.forEach(function (listing) {
    var postponed = parse.date.postponed(listing.body);
    var match;

    if (postponed) {
        tally.postponed++;
    } else {
        match = parse.date.strict(listing.body);
        if (match) {
            tally.nonpostponed++;
        } else {
            tally.failures++;
        }
    }
});

var successes = tally.postponed + tally.nonpostponed;
console.log('successes:', successes);
console.log('postponed:', tally.postponed);
console.log('nonpostponed:', tally.nonpostponed);
console.log('failures:', tally.failures);