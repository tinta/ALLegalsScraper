var express = require('express');
var bodyParser = require('body-parser');
var moment = require('moment');
var _ = require('lodash');
var squel = require("squel").useFlavour('mysql');
var app = express();
var port = 3000;

function addStaticPath (path) { return express.static(process.cwd() + path); }
app.use("/resources",   addStaticPath('/app/resources') );
app.use("/angular",     addStaticPath('/node_modules/angular'));
app.use("/angular-bootstrap",     addStaticPath('/node_modules/angular-bootstrap'));
app.use("/angular-sanitize",     addStaticPath('/node_modules/angular-sanitize'));
app.use("/ng-table",    addStaticPath('/node_modules/ng-table'));
app.use("/lodash",      addStaticPath('/node_modules/lodash'));
app.use("/moment",      addStaticPath('/node_modules/moment'));
app.use("/bootstrap",   addStaticPath('/node_modules/bootstrap'));
app.use("/font-awesome",   addStaticPath('/node_modules/font-awesome'));
app.use("/jquery",   addStaticPath('/node_modules/jquery'));

app.set('views', './app/views');
app.set('view engine',  'jade');
app.use(bodyParser.urlencoded({ extended: false }));
app.locals.pretty = true;
app.listen(port);

console.log('Now watching connections to port ' + port + '...');

// Custom requires
var db = require('./../common/db-connect.js')();
var util = require('./../common/util.js');
var timeframes = require('./server/timeframes.js');
var regions = require('./server/regions.js');
var sqlize = require('./server/sqlize.js');

var table = "foreclosures";

regions.set('northwest', [
    'colbert',
    'lauderdale',
    'franklin',
    'lawrence'
]);
regions.set('northeast', [
    'limestone',
    'madison',
    'jackson',
    'morgan',
    'marshall',
    'dekalb'
]);
regions.set('mid', [
    'cullman',
    'blount',
    'jefferson',
    'walker',
    'shelby',
]);
regions.set('midwest', [
    'marion',
    'lamar',
    'fayette',
    'winston',
    'walker',
    'pickens',
    'tuscaloosa'
]);
regions.set('mideast', [
    'cherokee',
    'etowah',
    'talladega',
    'calhoun',
    'clay',
    'randolph',
    'cleburne'
]);

timeframes.add('Current', 'Display sales occurring until end of this week');
timeframes.add('Next Week', 'Display sales occurring next week', 'next-week');
timeframes.add('All', 'Display all sales', 'all');

function renderListingsInRange (viewName, res, sqlStart, sqlEnd, region) {
    regions.setCurrent(region);
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
}

function renderListingsUntilEndOfWeek (page, res, sqlStart, region) {
    var sqlEnd = sqlize.endOfWeek(sqlStart)
    renderListingsInRange(page, res, sqlStart, sqlEnd, region);
}

app.get('/', function (req, res) {
    var scope = {};
    scope.regions = regions;
    res.render('index', scope);
});

app.get('/login', function (req, res) {
    var scope = {};
    res.render('login', scope);
});

app.get('/:region', function (req, res) {
    if (util.isPresent(regions.all[req.params.region])) {
        var startDate = moment().add(-1, 'd').format(sqlize.momentFormat);
        renderListingsUntilEndOfWeek('Current', res, startDate, req.params.region);
    } else {
        res.redirect('/');
    }
});

app.get('/:region/next-week', function (req, res) {
    var counties = regions.all[req.params.region].counties;
    if (util.isPresent(counties)) {
        var startDate = moment().day(8).format(sqlize.momentFormat);
        renderListingsUntilEndOfWeek('Next Week', res, startDate, req.params.region);
    } else {
        res.redirect('/');
    }
});

app.get('/:region/all', function (req, res) {
    var region = regions.all[req.params.region];

    if (util.isPresent(region)) {
        regions.setCurrent(region.name);
        var counties = region.counties;
        var sqlCounties = sqlize.counties(counties);
        var sqlGetForeclosures = squel
            .select()
            .from(table)
            .where(sqlCounties)
            .toString();

        db.query(sqlGetForeclosures, function(err, foreclosures) {
            if (err) throw err;
            foreclosures = foreclosures || {};
            var scope = {};
            scope.timeframes = timeframes.setCurrent('All').setRegion(req.params.region).stringify();
            scope.regions = JSON.stringify(regions.all);
            scope.foreclosures = JSON.stringify(foreclosures);
            res.render('region/index', scope);
        });
    } else {
        res.redirect('/');
    }
});

app.get('/:region', function (req, res) {
    var counties = regions.all[req.params.region];
    if (util.isPresent(counties)) {
        var startDate = moment().add(-1, 'd').format(sqlize.momentFormat);
        var endDate = sqlize.endOfWeek(startDate)
        renderListingsInRange(res, startDate, endDate, req.params.region);
    } else {
        res.redirect('/');
    }
});

app.post('/update', function(req, res) {
    var uid = req.body.uid;
    var err;

    if (!uid) {
        err = '`uid` must be defined when attempting to update a row';
        res.status(500).send(err)
        throw err;
        return;
    }

    var editableFields = [
        'sale_location',
        'sale_date',
        'city',
        'zip',
        'street_addr',
        'bed',
        'bath',
        'lot_area',
        'indoor_area',
        'build_year',
        'appraisal_price',
        'buy_price',
        'name1',
        'name2',
        'last_sold_price',
        'last_sold_year',
        'notes',
        'attorney',
        'bank'
    ];

    var sqlColumnUpdateMap = (function() {
        var _list = {};

        editableFields.forEach(function(field) {
            var value = req.body[field];
            if (value != undefined) {
                if (!util.isPresent(value)) {
                    value = null;
                }
                if (field == 'pub_date' || field == 'sale_date') {
                    value = moment(value).utcOffset(value).format('YYYY-MM-DD');
                }

                _list[field] = value;
            }
        });

        return _list;
    })();

    if (Object.keys(sqlColumnUpdateMap).length === 0) return new Error('no editable fields were passed to endpoint')

    var sqlUpdate = squel
        .update({replaceSingleQuotes: true})
        .table(table)
        .setFields(sqlColumnUpdateMap)
        .where("uid = " + db.escape(uid))
        .toString();

    db.query(sqlUpdate, function (err) {
        if (err) throw err;

        var sqlSelect = squel.select().from(table).where("uid = " + db.escape(uid)).toString();

        db.query(sqlSelect, function(err, results) {
            if (err) throw err;
            if (!results[0]) throw 'Could not find updated row';
            res.send(results[0]);
        });
    });
});

app.post('/delete', function(req, res) {
    var uid = req.body.uid;

    var sqlDelete = squel
        .delete()
        .from(table)
        .where("uid = " + uid)
        .toString();

    db.query(sqlDelete, function (err) {
        if (err) throw err;
        res.send(true);
    });
});
