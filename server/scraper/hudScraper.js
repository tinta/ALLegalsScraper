var scraper = function () {
    var url = 'http://www.alabamalegals.com/index.cfm?fuseaction=home';

    // `scrape` is executed within a console by phantomjs, so it all needs to be self-contained
    var scrape = function () {
        var listings = {};

        function addZ (n) {
            return n < 10 ? '0' + n : '' + n;
        }

        function getOffsetDate (offset) {
            var _date = new Date();
            _date.setDate(_date.getDate() + offset);
            var offsetDate = new Date(_date);
            var year = offsetDate.getFullYear();
            var month = offsetDate.getMonth() + 1;
            var day = offsetDate.getDate();

            month = addZ(month);
            day = addZ(day);

            return [
                year,
                month,
                day
            ].join('-');
        }


        return listings;
    };

    return {
        scrape: scrape,
        url: url
    }
}

module.exports = scraper;