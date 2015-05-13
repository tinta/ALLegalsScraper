// A collection for regions
var regions = {};
regions.all = {};
regions.set = function (name, counties) {
    var region = {};
    region.name = name;
    region.isCurrent = false;
    region.counties = counties;
    this.all[name] = region;
    return this;
};
regions.setCurrent = function (name) {
    _.each(this.all, function(region) {
        if (region.name == name) {
            region.isCurrent = true;
            return;
        }

        region.isCurrent = false;
    });
};

module.exports = regions;