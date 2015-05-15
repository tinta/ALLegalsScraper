function parseAddress(body) {
    var addrRe = /(?:for\sinformational\spurposes.*\:|property is commonly known as)\s?(.*?)\,\s*(.*?)\,\s*(?:Alabama|AL)\s*(3\d{4})/ig;
    var addressParts = addrRe.exec(body);
    var address = {};
    var city, streetAddr;

    if ((addressParts != null) && (addressParts.length === 4)) {
        streetAddr = addressParts[1];
        city = addressParts[2];

        if (streetAddr.length > 63) streetAddr = streetAddr.substring(0,63);
        if (city.length > 63) city = city.substring(0,63);

        address["city"] = city;
        address["street_addr"] = streetAddr;
        address["zip"] = addressParts[3];
    }

    return address;
}

module.exports = parseAddress;
