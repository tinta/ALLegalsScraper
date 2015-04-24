var mysql = require('mysql');

var connect = function () {
    var options = {};
    options.host = 'localhost';
    options.database = 'alabamalegals';
    options.user = 'scraper';
    options.password = process.env.HUD_DB_PW;

    return mysql.createConnection(options);
};

module.exports = connect;