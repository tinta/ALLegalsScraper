// Third party scripts
//      Routing-related scripts
var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var session = require('express-session');

//      Oauth scripts
var passport = require('passport');

//      Other
var moment = require('moment');
var _ = require('lodash');
var Q = require('q');
var squel = require("squel").useFlavour('mysql');

// Custom scipts
var db = require('./../common/db-connect.js')();
var util = require('./../common/util.js');
var sql = require('./../common/sql.js');
var timeframes = require('./server/timeframes.js');
var regions = require('./server/regions.js');
var oauth = require('./server/oauth');
var renderListings = require('./server/renderListings');

// Routing Setup
var app = express();
var port = 3000;

function addStaticPath (path) { return express.static(process.cwd() + path); }

app.set('views', './app/views');
app.set('view engine',  'jade');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));

app.use("/resources",   addStaticPath('/app/resources') );
app.use("/angular",     addStaticPath('/node_modules/angular'));
app.use("/angular-bootstrap-npm",     addStaticPath('/node_modules/angular-bootstrap-npm'));
app.use("/angular-sanitize",     addStaticPath('/node_modules/angular-sanitize'));
app.use("/ng-table",    addStaticPath('/node_modules/ng-table'));
app.use("/lodash",      addStaticPath('/node_modules/lodash'));
app.use("/moment",      addStaticPath('/node_modules/moment'));
app.use("/bootstrap",   addStaticPath('/node_modules/bootstrap'));
app.use("/font-awesome",   addStaticPath('/node_modules/font-awesome'));
app.use("/jquery",   addStaticPath('/node_modules/jquery'));

// Oauth setup
app.use(passport.initialize());
//      Use passport.session() middleware to persist login sessions
app.use(passport.session());

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// Middleware for finding/creating logged-in user
passport.use(oauth.google.completeStrategy());

// Server init
app.locals.pretty = true;
app.listen(port);

console.log('Now watching connections to port ' + port + '...');

app.get('/', function (req, res) {
    var scope = {};
    scope.regions = regions;
    scope.user = false;

    if (!req.user) {
        res.render('index', scope);
        return;
    }

    sql.user.findOrCreate('googleId', req.user.id).then(function(user){
        scope.user = user;
        res.render('index', scope);
    });
});

app.get('/logout', function(req, res){
    req.logOut();
    res.redirect('/');
});

app.get('/:region', function (req, res) {
    var region = req.params.region;
    var scope = {};
    var startDate;
    var promiseUser;

    if (regions.contains(region)) {

        startDate = moment()
            .add(-1, 'd')
            .format(sql.momentFormat);

        scope.region = regions.setCurrent(region);
        scope.regions = regions.all;
        scope.timeframe = timeframes.setRegion(region).setCurrent('Current');
        scope.timeframes = timeframes.all;

        if (req.user && req.user.id) {
            promiseUser = sql.user.findOrCreate('googleId', req.user.id);
        } else {
            promiseUser = Q(false);
        }

        Q.all([
            promiseUser,
            sql.listings.findUntilEndOfWeek(scope.region, startDate)
        ])
        .then(function(results) {
            var user = results[0];
            var listings = results[1];
            util.print1(user);
            util.print2(listings);
            if (util.isPresent(user)) scope.user = user;
            scope.listings = listings;
            res.render('region/index', scope);
        }, function(err) {
            res.redirect('/');
            if (err) throw err;
        });
    } else {
        res.redirect('/');
    }
});

app.get('/:region/next-week', function (req, res) {
    var region = req.params.region;
    var scope = {};
    var startDate;
    var promiseUser;

    if (regions.contains(region)) {

        startDate = moment()
            .day(8)
            .format(sql.momentFormat);

        scope.region = regions.setCurrent(region);
        scope.regions = regions.all;
        scope.timeframe = timeframes.setRegion(region).setCurrent('Next Week');
        scope.timeframes = timeframes.all;

        if (req.user && req.user.id) {
            promiseUser = sql.user.findOrCreate('googleId', req.user.id);
        } else {
            promiseUser = Q(false);
        }

        Q.all([
            promiseUser,
            sql.listings.findUntilEndOfWeek(scope.region, startDate)
        ])
        .then(function(results) {
            var user = results[0];
            var listings = results[1];
            util.print1(user);
            util.print2(listings);
            if (util.isPresent(user)) scope.user = user;
            scope.listings = listings;
            res.render('region/index', scope);
        }, function(err) {
            res.redirect('/');
            if (err) throw err;
        });
    } else {
        res.redirect('/');
    }
});

app.get('/:region/all', function (req, res) {
    var region = regions.all[req.params.region];

    if (util.isPresent(region)) {
        regions.setCurrent(region.name);
        var counties = region.counties;
        var sqlCounties = sql.cast.counties(counties);
        var sqlGetForeclosures = squel
            .select()
            .from("foreclosures")
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
        var startDate = moment().add(-1, 'd').format(sql.momentFormat);
        var endDate = sql.cast.endOfWeek(startDate)
        renderListings.inRange(res, startDate, endDate, req.params.region);
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

// GET /auth/google
// ================
// - After authorization, Google will redirect the user back to this app at /auth/google/callback
// - The request will be redirected to Google for authentication, so provided function will not be called.
app.get(
    '/auth/google',
    oauth.google.middleware.authenticate(),
    function(){}
);

// GET /auth/google/callback
// - Use passport.authenticate() as route middleware to authenticate the request.
// - Can be used to handle both failed and successful attempts to login
app.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    function(req, res) {
        res.redirect('/');
    }
);