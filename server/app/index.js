var express = require('express');
var bodyParser = require('body-parser');
var moment = require('moment');
var squel = require("squel").useFlavour('mysql');
var app = express();
var port = 3000;

app.set('views', './server/app/views');
app.set('view engine',  'jade');
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/resources",   addStaticAssetsPath('/resources') );
app.use("/angular",     addStaticAssetsPath('/node_modules/angular'));
app.use("/angular-sanitize",     addStaticAssetsPath('/node_modules/angular-sanitize'));
app.use("/ng-table",    addStaticAssetsPath('/node_modules/ng-table'));
app.use("/lodash",      addStaticAssetsPath('/node_modules/lodash'));
app.use("/moment",      addStaticAssetsPath('/node_modules/moment'));
app.use("/bootstrap",   addStaticAssetsPath('/node_modules/bootstrap'));
app.use("/font-awesome",   addStaticAssetsPath('/node_modules/font-awesome'));
app.use("/jquery",   addStaticAssetsPath('/node_modules/jquery'));
app.locals.pretty = true;

app.listen(port);
console.log('Now watching connections to port ' + port + '...');

var db = require('./../db-connect.js')();
var util = require('./../util.js');
var table = "foreclosures";

function addStaticAssetsPath (path) {
    return express.static(process.cwd() + path)
}

app.get('/', function (req, res) {

    var sqlGetForeclosures = squel.select().from(table).toString();
    console.log("1. " + sqlGetForeclosures);

    db.query(sqlGetForeclosures, function(err, foreclosures) {
        if (err) throw err;
        foreclosures = foreclosures || {};
        var scope = {};
        scope.foreclosures = JSON.stringify(foreclosures);
        res.render('index', scope);
    });
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

    var sqlUpdate = squel.update({replaceSingleQuotes: true}).table(table).setFields(sqlColumnUpdateMap).where("uid = " + db.escape(uid)).toString();
    console.log("2. "  + sqlUpdate);

    db.query(sqlUpdate, function (err) {
        if (err) throw err;

        console.log('UPDATED!')

        var sqlSelect = squel.select().from(table).where("uid = " + db.escape(uid)).toString();
        console.log("3. " + sqlSelect)

        db.query(sqlSelect, function(err, results) {
            if (err) throw err;
            if (!results[0]) throw 'Could not find updated row';
            res.send(results[0]);
        });
    });
});
