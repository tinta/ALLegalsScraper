var express = require('express');
var bodyParser = require('body-parser');
var moment = require('moment');
var squel = require("squel").useFlavour('mysql');
var app = express();
var port = 3000;

function addStaticPath (path) { return express.static(process.cwd() + path); }
app.use("/resources",   addStaticPath('/app/resources') );
app.use("/angular",     addStaticPath('/node_modules/angular'));
app.use("/angular-bootstrap",     addStaticPath('/node_modules/angular-bootstrap'));
app.use("/template",   addStaticPath('/node_modules/angular-bootstrap/template'));
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

var table = "foreclosures";

var regions = {};
regions.northwest = [
    'colbert',
    'lauderdale',
    'franklin',
    'lawrence'
];
regions.northeast = [
    'limestone',
    'madison',
    'jackson',
    'morgan',
    'marshall',
    'dekalb'
];
regions.mid = [
    'cullman',
    'blount',
    'jefferson',
    'walker',
    'shelby',
];
regions.midwest = [
    'marion',
    'lamar',
    'fayette',
    'winston',
    'walker',
    'pickens',
    'tuscaloosa'
];
regions.mideast = [
    'cherokee',
    'etowah',
    'talladega',
    'calhoun',
    'clay',
    'randolph',
    'cleburne'
];

var sqlize = {};
sqlize.momentFormat = 'YYYY-MM-DD';
sqlize.endOfWeek = function (yyyymmdd) {
    var startMoment = moment(yyyymmdd, this.momentFormat).add(-1, 'd');
    var eowDay = 6;
    var eowMoment = moment(startMoment);
    var inWeekend = (
        startMoment.day() == 5 ||
        startMoment.day() == 6
    );

    if (inWeekend) eowDay = 13;

    return eowMoment.day(eowDay).format(this.momentFormat);
};
sqlize.counties = function (counties) {
    var _counties = [];
    counties.forEach(function(county) {
        _counties.push('county = ' + db.escape(county));
    });
    return _counties.join(' OR ');
};

function renderListingsInRange (page, res, sqlStart, sqlEnd, region) {
    var counties = regions[region];
    var sqlCounties = sqlize.counties(counties);
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
        scope.page = page;
        scope.region = region;
        scope.counties = counties;
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
    var counties = regions[req.params.region];
    if (util.isPresent(counties)) {
        var startDate = moment().add(-1, 'd').format(sqlize.momentFormat);
        renderListingsUntilEndOfWeek('current', res, startDate, req.params.region);
    } else {
        res.redirect('/');
    }
});

app.get('/:region/next-week', function (req, res) {
    var counties = regions[req.params.region];
    if (util.isPresent(counties)) {
        var startDate = moment().day(8).format(sqlize.momentFormat);
        renderListingsUntilEndOfWeek('next-week', res, startDate, req.params.region);
    } else {
        res.redirect('/');
    }
});

app.get('/:region/all', function (req, res) {
    var counties = regions[req.params.region];
    if (util.isPresent(counties)) {
        var counties = regions[req.params.region];
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
            scope.page = 'all';
            scope.region = req.params.region;
            scope.foreclosures = JSON.stringify(foreclosures);
            res.render('region/index', scope);
        });
    } else {
        res.redirect('/');
    }
});

app.get('/:region', function (req, res) {
    var counties = regions[req.params.region];
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
