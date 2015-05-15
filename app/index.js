// Third party scripts
//      Routing-related scripts
var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var methodOverride = require('method-override');
var session = require('express-session');

//      Oauth scripts
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

//      Other
var moment = require('moment');
var _ = require('lodash');
var squel = require("squel").useFlavour('mysql');

// Custom scipts
var db = require('./../common/db-connect.js')();
var util = require('./../common/util.js');
var timeframes = require('./server/timeframes.js');
var regions = require('./server/regions.js');
var sqlize = require('./server/sqlize.js');

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
app.use("/angular-bootstrap",     addStaticPath('/node_modules/angular-bootstrap'));
app.use("/angular-sanitize",     addStaticPath('/node_modules/angular-sanitize'));
app.use("/ng-table",    addStaticPath('/node_modules/ng-table'));
app.use("/lodash",      addStaticPath('/node_modules/lodash'));
app.use("/moment",      addStaticPath('/node_modules/moment'));
app.use("/bootstrap",   addStaticPath('/node_modules/bootstrap'));
app.use("/font-awesome",   addStaticPath('/node_modules/font-awesome'));
app.use("/jquery",   addStaticPath('/node_modules/jquery'));

// Oauth setup
app.use(passport.initialize());
// Use passport.session() middleware to persist login sessions
app.use(passport.session());
passport.serializeUser(function(user, done) {
    util.print2(user)
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
    util.print3(obj)
  done(null, obj);
});


// Server init
app.locals.pretty = true;
app.listen(port);

console.log('Now watching connections to port ' + port + '...');

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

timeframes.add('Current', 'Display sales occurring between yesterday and the end of this week');
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
    util.print1(req.user);
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

var oauth = {};
oauth.google = {};

// Client ID, client secret and redirectUrl are defined at
// https://code.google.com/apis/console
oauth.google.clientId = '555054377171-n8geoctm8268uummgi35cb86uon8nusk.apps.googleusercontent.com';
oauth.google.clientSecret = 'tUn5s9AkUNx3LICuWMgP4ka3';
oauth.google.redirectUrl = 'http://127.0.0.1:3000/auth/google/callback';

oauth.google.middleware = {};

// .authenticate()
// ===============
// - Use passport.authenticate() as route middleware to authenticate the request

// - This is the first step in Google authentication, which involves redirecting the client to google.com.

oauth.google.middleware.authenticate = function () {
    return passport.authenticate(
        'google',
        {
            scope: ['https://www.googleapis.com/auth/plus.login']
        }
    )
};


passport.use(new GoogleStrategy({
    clientID: oauth.google.clientId,
    clientSecret: oauth.google.clientSecret,
    callbackURL: oauth.google.redirectUrl
  },
  function(accessToken, refreshToken, profile, done) {
    // User.findOrCreate({ googleId: profile.id }, function (err, user) {
    // var user = {};
    // user.googleId = profile.id;
    // user.name = profile.displayName;

    var table = 'users';

    var sqlFindUser = squel
        .select()
        .from(table)
        .where('googleId = ' + db.escape(profile.id))
        .toString();

    console.log('1');

    db.query(sqlFindUser, function(err, users) {
        console.log('2');

        if (err) throw err;

        // If User already exists
        var userDoesExist = util.isPresent(users) && util.isPresent(users[0])
        if (userDoesExist) {
            done(null, users[0]);
            return;
        }

        // If User does not already exist
        var image = (profile.image && profile.image.url) ? profile.image.url : null;
        var email = (
            util.isPresent(profile.emails) &&
            util.isPresent(profile.emails[0]) &&
            util.isPresent(profile.emails[0].value)
        ) ? profile.emails[0].value : null;

        var insertMap = {};
        insertMap.accountIsActive = false;
        insertMap.googleId = profile.id;
        insertMap.googleImageUrl = image;
        insertMap.googleEmail = email;
        insertMap.name = profile.displayName ||  null;

        var sqlInsertUser = squel
            .insert({replaceSingleQuotes: true})
            .into(table)
            .setFields(insertMap)
            .toString();

        db.query(sqlInsertUser, function(err, insertObj) {
            if (err) throw err;
            console.log('3');
            console.log(insertObj);
            done(null, insertMap);
        });
    });

    console.log(profile)
    console.log(Array(40).join('==+'))
    return done(false, profile);
}));

// GET /auth/google
// ================
// - After authorization, Google will redirect the user back to this app at /auth/google/callback

// - The request will be redirected to Google for authentication, so provided function will not be called.

app.get('/auth/google', oauth.google.middleware.authenticate(), function(){});

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    function(req, res) {
        res.redirect('/');
    }
);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}