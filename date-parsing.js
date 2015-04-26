var parse = {};

parse.date = {};

parse.date.months = 'January|February|March|April|May|June|July|August|September|October|November|December';
parse.date.finderLong = ".{0,30}\\s20\\d\\d";
parse.date.finderShort = "\\d\\d\\/\\d\\d\\/\\d\\d";
parse.date.finderLongOrShort = [
    '(', parse.date.finderLong, '|', parse.date.finderShort, ')'
].join('');

parse.date.strict = function (str) {
    var re1 = new RegExp("(?:Alabama(?:,)?(?:.{0,30})?\\son\\s)(" + parse.date.finderLong + ')',"gi");
    var re2 = new RegExp("(?:of\\ssale(?:,?\\son\\s(?:the\\s)?)?)" + '(' + parse.date.finderShort + '|' + parse.date.finderLong + ')', "gi");
    var re3 = new RegExp("(?:sale\\scontained\\sin\\sthe\\ssaid\\smortgage\\swill,\\son\\s)(" + parse.date.finderLong + ')', "gi");
    var re4 = new RegExp("(?:between\\s11\\:00\\sA\\.M\\.\\sand\\s3\\:00\\sP\\.M\\.\\son\\s)(" + parse.date.finderLong + ')', "gi");

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
            // console.log(match[1])
            var match = match[1]
                .replace(/(the)|(day\sof)|(the)/gi, '')
                .replace(/(^\s)|(,)|(tuesday)/gi, '')
                .replace(/\s\s/gi, ' ')
                .replace(/(^\s)/gi, '')
            var foo = momentize(match)

            if (foo && foo.isValid()) {
                console.log('!', foo.format('YYYY-MM-Do'), '<', match)
            } else {
                console.log(foo, foo.isValid())
                console.log(match)
            }

        } else {
            tally.failures++;
        }
    }
});

function momentize (str) {
    var re1 = new RegExp('^\\d{1,2}..\\s(' + parse.date.months + ')', 'gi');
    var re2 = new RegExp('^(' + parse.date.months + ')', 'gi');
    var re3 = new RegExp('^([01]\\d\\/[0123]\\d\\/\\d\\d)', 'gi');
    if (re1.test(str)) return moment(str, 'Do MMMM, YYYY');
    if (re2.test(str)) return moment(str, 'MMMM D, YYYY');
    if (re3.test(str)) return moment(str, 'MM/DD/YY');
    return false;
}

var successes = tally.postponed + tally.nonpostponed;
console.log('successes:', successes);
console.log('postponed:', tally.postponed);
console.log('nonpostponed:', tally.nonpostponed);
console.log('failures:', tally.failures);