var Express = require('express');

console.log(process.cwd())

var app = Express();
app.set('views', './server/app/views');
app.set('view engine', 'jade');
app.use("/resources", Express.static(process.cwd() + '/resources'));
app.use("/angular", Express.static(process.cwd() + '/node_modules/angular'));
app.use("/ng-table", Express.static(process.cwd() + '/node_modules/ng-table'));
app.use("/lodash", Express.static(process.cwd() + '/node_modules/lodash'));
app.use("/moment", Express.static(process.cwd() + '/node_modules/moment'));
app.use("/bootstrap", Express.static(process.cwd() + '/node_modules/bootstrap'));
app.locals.pretty = true;

var port = 3000;

app.listen(port);

console.log('Now watching connections to port ' + port + '...');

var db = require('./../db-connect.js')();

app.get('/', function (req, res) {

    var SQLGetForeclosures = [
        'SELECT *',
        'FROM foreclosures'
    ].join(' ');

    // db.connect();
    db.query(SQLGetForeclosures, function(err, foreclosures) {
        // if (err) db.end();
        // db.end();
        console.log(err)
        console.log(foreclosures)
        foreclosures = foreclosures || {};
        var scope = {};
        scope.foreclosures = JSON.stringify(foreclosures);
        res.render('index', scope);
    });
});