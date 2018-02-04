function parseAddress (body) {
    var addrRe = /(?:for\sinformational\spurposes.?\:|is commonly known as)\s(.*?)\s?\,\s?(?:\(the \"Real Property\"\) situated in\s?)?(.*?)\s?\,\s*(?:Alabama|AL)\s?(3\d{4})?/ig;
    var addressMatch = addrRe.exec(body);
    var address = {};

    if ((addressMatch != null) && (addressMatch.length === 4)) {
        address["city"] = truncate(addressMatch[2], 63);
        address["street_addr"] = truncate(addressMatch[1], 63);
        address["zip"] = addressMatch[3];
    } else {
        (function() {
            var streetRe = /(?:the home and real estate known as )(.*)(?:\. This)/ig;
            var cityRe = /(?:located in the City of )(.{2,20})(?:, Alabama)/ig;
            var streetMatch = streetRe.exec(body);
            var cityMatch = cityRe.exec(body);

            if (streetMatch) address['street_addr'] = truncate(streetMatch[1], 63);
            if (cityMatch) address['city'] = truncate(cityMatch[1], 63);

        })();
    }

    return address;
}

function truncate (str, limit) {
    var tooLong = str.length > limit;
    if (tooLong) return str.substring(0, limit);
    return str;
}

module.exports = parseAddress;
