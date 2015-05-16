// A collection for timeframes
var timeframes = {};
timeframes.all = [];

// .add()
// - Use instead of directly populating `.all`
// - Assists with maintaining uniformity of data in items listed in `.all`
timeframes.add = function (name, description, urlEnd) {
    if (!urlEnd) urlEnd = '';
    if (!description) description = '';
    var timeframe = {};
    timeframe.name = name;
    timeframe.link = undefined;
    timeframe.urlEnd = urlEnd;
    timeframe.description = description;
    timeframe.isCurrent = false;
    this.all.push(timeframe);
    return this;
};

// .setCurrent()
// - Used to define what the current timeframe is while also defining all other timeframes as "not current"
// - After calling this, passing `.all` to the template scope allows the template to know what
//      the "current" timeframe of the rendered page is
timeframes.setCurrent = function (name) {
    var current;
    this.all.forEach(function(timeframe) {
        if (timeframe.name == name) {
            current = timeframe;
            timeframe.isCurrent = true;
        } else {
            timeframe.isCurrent = false;
        }
    });
    return current;
};

// .setRegion()
// - Needs to be called before sending `.all` off to template engine
// - Defines links for timeframes since timeframe routes are /:region/:timeframe/
timeframes.setRegion = function (region) {
    this.all.forEach(function(timeframe) {
        timeframe.link = '/' + region + '/' + timeframe.urlEnd;
    });
    return this;
};

// .stringify()
// - Useful for ending a chain of calls to `timeframes` and getting it ready for the template engine
timeframes.stringify = function () {
    return JSON.stringify(this.all);
};

// Values for timeframes
timeframes.add('Current', 'Display sales occurring between yesterday and the end of this week');
timeframes.add('Next Week', 'Display sales occurring next week', 'next-week');
timeframes.add('All', 'Display all sales', 'all');

module.exports = timeframes;