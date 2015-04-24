var express = require('express');
var port = 3000;
var app = express();
app.set('views', './server/app/views');
app.set('view engine',  'jade');
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

function addStaticAssetsPath (path) {
    return express.static(process.cwd() + path)
}

app.get('/', function (req, res) {

    var SQLGetForeclosures = [
        'SELECT *',
        'FROM foreclosures'
    ].join(' ');

    db.query(SQLGetForeclosures, function(err, foreclosures) {
        if (err) console.log(err)
        foreclosures = foreclosures || {};
        var scope = {};
        scope.foreclosures = JSON.stringify(foreclosures);
        res.render('index', scope);
    });
});