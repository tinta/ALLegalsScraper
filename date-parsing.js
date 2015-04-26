var re = {};
re.yyyy = '\\d\\d\\d\\d';
re.mmmm = 'January|February|March|April|May|June|July|August|September|October|November|December';
re.dd = '[0123]\\d';
re.mm = '[01]\\d';

var regexi = [
    {
        // 1st January 2016
        re: new RegExp('\\d{1,2}..\\s(' + re.mmmm + ')\\s' + re.yyyy, 'gi'),
        momentFormat: 'Do MMMM, YYYY',
    },
    {
        // January 01 2016 and January 1 2016
        re: new RegExp('((' + re.mmmm + ')\\s(\\d{1,2})\\s)' + re.yyyy, 'gi'),
        momentFormat: 'MMMM D, YYYY',
    },
    {
        // MM/DD/YYYY
        re: new RegExp('(' + re.mm + '\\/' + re.dd + '\\/' + re.yyyy + ')', 'gi'),
        momentFormat: 'MMMM D, YYYY',
    },
    {
        // MM/DD/YY
        re: new RegExp('(' + re.mm + '\\/' + re.dd + '\\/\\d\\d)(?:\\s)', 'gi'),
        momentFormat: 'MMMM D, YYYY',
    },
];

listings.forEach(function(listing) {
    var parsedText = listing.body
            .replace(/(the(?:\s))|(day\sof)|(the)/gi, '')
            .replace(/(^\s)|(,)|(monday|tuesday|wednesday|thursday|friday)/gi, '')
            .replace(/\s\s/gi, ' ')
            .replace(/(^\s)/gi, '')

    var moments = [];

    regexi.forEach(function(regex) {
        var matches = parsedText.match(regex.re);
        var _moments = castToMoments(matches, regex.momentFormat);
        moments = _.union(moments, _moments);
    });

    function castToMoments (list, format) {
        var _moments = [];
        if (list) {
            list.forEach(function(result) {
                _moments.push(moment(result, format));
            });
        }
        return _moments;
    }

    // Moment that is most in future will be first item in array
    var moments = moments.sort(function (a, b) {
        return parseInt(b.format('X')) - parseInt(a.format('X'));
    });

    var saleMoment = moments[0];
    var maxFutureMoment = moment().add('4', 'months');

    if (maxFutureMoment.isBefore(saleMoment)) saleMoment = moments[1];

    console.log(saleMoment.format('YYYY-MM-DD'))
});