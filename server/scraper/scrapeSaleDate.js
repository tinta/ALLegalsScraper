function scrapeSaleDate (bodyText) {
    var postponedMatch = scrapePostponedDateText(bodyText);
    var regularMatch = scrapeDateText(bodyText);
    var match = false;

    if (postponedMatch && postponedMatch[1]) {
        match = postponedMatch[1];
    } else if (regularMatch && regularMatch[1]) {
        match = regularMatch[1]
    }

    if (match) {
        match = match
            .replace(/(the)|(day\sof)|(the)/gi, '')
            .replace(/(^\s)|(,)|(tuesday)/gi, '')
            .replace(/\s\s/gi, ' ')
            .replace(/(^\s)/gi, '')

        saleDateMoment = momentize(match);

        if (saleDateMoment && saleDateMoment.isValid()) {
            return saleDateMoment.format('YYYY-MM-DD');
        }
    }

    return null;
}

var regexMonths = 'January|February|March|April|May|June|July|August|September|October|November|December';
var regexDateLong = ".{0,30}\\s20\\d\\d";
var regexDateShort = "\\d\\d\\/\\d\\d\\/\\d\\d";
var regexDateLongOrShort = [
    '(', regexDateLong, '|', regexDateShort, ')'
].join('');

scrapeDateText = function (str) {
    var re1 = new RegExp("(?:Alabama(?:,)?(?:.{0,30})?\\son\\s)(" + regexDateLong + ')',"gi");
    var re2 = new RegExp("(?:of\\ssale(?:,?\\son\\s(?:the\\s)?)?)" + regexDateLongOrShort, "gi");
    var re3 = new RegExp("(?:sale\\scontained\\sin\\sthe\\ssaid\\smortgage\\swill,\\son\\s)(" + regexDateLong + ')', "gi");
    var re4 = new RegExp("(?:between\\s11\\:00\\sA\\.M\\.\\sand\\s3\\:00\\sP\\.M\\.\\son\\s)(" + regexDateLong + ')', "gi");

    return (
        re1.exec(str) ||
        re2.exec(str) ||
        re3.exec(str) ||
        re4.exec(str)
    );
}

function scrapePostponedDateText (str) {
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
}

function momentize (str) {
    var re1 = new RegExp('^\\d{1,2}..\\s(' + regexMonths + ')', 'gi');
    var re2 = new RegExp('^(' + regexMonths + ')', 'gi');
    var re3 = new RegExp('^([01]\\d\\/[0123]\\d\\/\\d\\d)', 'gi');
    if (re1.test(str)) return moment(str, 'Do MMMM, YYYY');
    if (re2.test(str)) return moment(str, 'MMMM D, YYYY');
    if (re3.test(str)) return moment(str, 'MM/DD/YY');
    return false;
}

module.exports = scrapeSaleDate;