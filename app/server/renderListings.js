var renderListings = {};

renderListings.inRange = function (viewName, res, sqlStart, sqlEnd, region) {
    regions.setCurrent(region);
    var table = "foreclosures";
    var currentRegion = _.findWhere(regions.all, {isCurrent: true});
    var sqlCounties = sqlize.counties(currentRegion.counties);
    var sqlInRange = squel
        .select()
        .from(table)
        .where('sale_date > ' + db.escape(sqlStart))
        .where('sale_date < ' + db.escape(sqlEnd))
        .where(sqlCounties)
        .toString();

    db.query(sqlInRange, function(err, results) {
        if (err) throw err;
        results = results || {};
        var scope = {};
        scope.timeframes = timeframes.setCurrent(viewName).setRegion(region).stringify();
        scope.region = region;
        scope.regions = JSON.stringify(regions.all);
        scope.foreclosures = JSON.stringify(results);
        res.render('region/index', scope);
    });
};

renderListings.untilEndOfWeek = function (page, res, sqlStart, region) {
    var sqlEnd = sqlize.endOfWeek(sqlStart)
    renderListings.inRange(page, res, sqlStart, sqlEnd, region);
};

module.exports = renderListings;