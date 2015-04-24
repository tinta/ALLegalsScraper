var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var port = 3000;

app.set('views', './server/app/views');
app.set('view engine',  'jade');
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/resources",   addStaticAssetsPath('/resources') );
app.use("/angular",     addStaticAssetsPath('/node_modules/angular'));
app.use("/ng-table",    addStaticAssetsPath('/node_modules/ng-table'));
app.use("/lodash",      addStaticAssetsPath('/node_modules/lodash'));
app.use("/moment",      addStaticAssetsPath('/node_modules/moment'));
app.use("/bootstrap",   addStaticAssetsPath('/node_modules/bootstrap'));
app.locals.pretty = true;

app.listen(port);
console.log('Now watching connections to port ' + port + '...');

var db = require('./../db-connect.js')();
var util = require('./../util.js');
var table = 'foreclosures';

function addStaticAssetsPath (path) {
    return express.static(process.cwd() + path)
}

app.get('/', function (req, res) {

    var sqlGetForeclosures = [
        'SELECT *',
        'FROM',
        table
    ].join(' ');

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

    if (!uid) return new Error('`uid` must be defined when attempting to update a row');

    var editableFields = [
        'street_addr',
        'city',
        'sale_location',
        'sale_date',
        'zip',
        'price',
        'bed',
        'bath',
        'lot_area',
        'indoor_area',
        'build_year'
    ];

    var sqlColumnUpdateList = (function() {
        var _list = [];

        editableFields.forEach(function(field) {
            if (req.body[field] != undefined) {
                var colUpdate = util.encaseInTicks(field) + '=' + req.body[field];
                _list.push(colUpdate)
            }
        });

        return _list.join(', ');
    })();

    var sqlWhereUID = [
        'WHERE',
        util.encaseInTicks('uid'),
        '=',
        uid
    ].join(' ');

    var sqlUpdate = [
        'UPDATE',
        table,
        'SET',
        sqlColumnUpdateList,
        sqlWhereUID
    ].join(' ');

    db.query(sqlUpdate, function (err) {
        if (err) throw err;

        var sqlSelect = [
            'SELECT *',
            'FROM', table,
            sqlWhereUID
        ].join(' ');

        db.query(sqlSelect, function(err, results) {
            if (err) throw err;
            if (!results[0]) throw 'Could not find updated row';
            res.send(results[0]);
        });
    });
});