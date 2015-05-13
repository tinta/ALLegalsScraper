// A collection for timeframes
var timeframes = {};
timeframes.all = [];

timeframes.add = function (name, description, urlEnd) {
    if (!urlEnd) urlEnd = '';
    if (!description) description = '';
    var view = {};
    view.name = name;
    view.link = undefined;
    view.urlEnd = urlEnd;
    view.description = description;
    view.isCurrent = false;
    this.all.push(view);
    return this;
};

timeframes.setCurrent = function (name) {
    this.all.forEach(function(view) {
        if (view.name == name) {
            view.isCurrent = true;
        } else {
            view.isCurrent = false;
        }
    });
    return this;
};

timeframes.setRegion = function (region) {
    this.all.forEach(function(view) {
        view.link = '/' + region + '/' + view.urlEnd;
    });
    return this;
}

timeframes.stringify = function () {
    return JSON.stringify(this.all);
}

module.exports = timeframes;