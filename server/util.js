var exports = {};

function encase (casing, text) {
    return casing + text + casing;
}

exports.encaseInQuotes = function (text) {
    return encase('"', text);
};

exports.encaseInTicks = function (text) {
    return encase('`', text);
};

module.exports = exports;