var parse = {};

parse.date = {};

parse.date.months = 'January|February|March|April|May|June|July|August|September|October|November|December'

parse.date.strict = function (str) {
    var re1 = /(?:Alabama\,\son\s)((January|February|March|April|May|June|July|August|September|October|November|December).{0,10}\s20\d\d)/gi;
    var re2 = /(?:Alabama\,\swithin\sthe\slegal\shours\sof\ssale)(.{0,30}\s20\d\d)/gi;
    var re3 = /(?:Alabama\,\sduring\sthe\slegal\shours\sof\ssale)(.{0,30}\s20\d\d)/gi;
    // var re4 = /(?:Alabama\,\sduring\sthe\slegal\shours\sof\ssale\,\son\s)((January|February|March|April|May|June|July|August|September|October|November|December).{0,10}\s20\d\d)/gi;
    var results1 = re1.exec(str);
    var results2 = re2.exec(str);
    var results3 = re3.exec(str);
    return results1 || results2 || results3;
}

parse.date.postponed = function (str) {
    var re1 = /(?:The\sabove\smortgage\sforeclosure\ssale\shas\sbeen\spostponed\suntil\s)((January|February|March|April|May|June|July|August|September|October|November|December).{0,10}\s20\d\d)/gi;
    var re2 = /(?:The\sabove\smortgage\sforeclosure\ssale\shas\sbeen\spostponed\suntil\s)(\d\d\/\d\d\/20\d\d)/gi;
    var re3 = /(?:THIS\sFORECLOSURE\sSALE\sHAS\sBEEN\sCONTINUED\sTO\s)((January|February|March|April|May|June|July|August|September|October|November|December).{0,10}\s20\d\d)/gi;
    var re4 = /(?:THIS\sFORECLOSURE\sSALE\sHAS\sBEEN\sCONTINUED\sTO\s)(\d\d\/\d\d\/20\d\d)/gi;
    var re5 = /(?:THE\sREFERENCED\sFORECLOSURE\sSALE\sABOVE\sIS\sCONTINUED\sTO\s)((January|February|March|April|May|June|July|August|September|October|November|December).{0,10}\s20\d\d)/gi;
    var results1 = re1.exec(str);
    var results2 = re2.exec(str);
    var results3 = re3.exec(str);
    var results4 = re4.exec(str);
    var results5 = re5.exec(str);
    return results1 || results2 || results3 || results4 || results5;
}

listings.forEach(function (listing) {
    var postponed = parse.date.postponed(listing.body);
    var match;

    if (postponed) {
        console.log(Array(30).join('--='))
        console.log('POSTPONED');
        console.log(postponed[1])
    } else {
        match = parse.date.strict(listing.body);

        if (match) {
            console.log('!', match[1]);
            if (match[1][match[1].length - 1] == 4) {
                console.log(listing.body)
            }
        } else {
            console.log(Array(30).join('--='))
            console.log('ERROR', match)
            console.log(listing.body)
        }
    }
});