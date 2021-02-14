var ircColors = require('irc-colors');
var replyFor = require('./codes');

/**
 * parseMessage(line, stripColors)
 *
 * takes a raw "line" from the IRC server and turns it into an object with
 * useful keys
 * @param {String} line Raw message from IRC server.
 * @param {Boolean} stripColors If true, strip IRC colors.
 * @return {Object} A parsed message object.
 */
module.exports = function parseMessage(line, stripColors) {
    var message = {};
    var match;

    if (stripColors) {
        line = ircColors.stripColorsAndStyle(line);
    }

    // Parse prefix
    match = line.match(/^:([^ ]+) +/);
    if (match) {
        message.prefix = match[1];
        line = line.replace(/^:[^ ]+ +/, '');

        // Allow . (dot), : (colon) and / (slash) in the nickname for compatibility
        // with certain substandard IRC implementations (like the PSYC's built-in IRC gate).
        // However, only allow those characters when we are sure that we are not taking
        // a server hostname for a nick (otherwise any server hostname would get misparsed
        // as a nick without !user@host).

        match = message.prefix.match(/^([_a-zA-Z0-9\[\]\\`^{}|-]*)(!([^@]+)@(.*))?$/) ||
                message.prefix.match(/^([_a-zA-Z0-9\[\]\\`^{}|:./-]*)(!([^@]+)@(.*))$/);
        if (match) {
            message.nick = match[1];
            message.user = match[3];
            message.host = match[4];
        }
        else {
            message.server = message.prefix;
        }
    }

    // Parse command
    match = line.match(/^([^ ]+) */);
    message.command = match[1];
    message.rawCommand = match[1];
    message.commandType = 'normal';
    line = line.replace(/^[^ ]+ +/, '');

    if (replyFor[message.rawCommand]) {
        message.command     = replyFor[message.rawCommand].name;
        message.commandType = replyFor[message.rawCommand].type;
    }

    message.args = [];
    var middle, trailing;

    // Parse parameters
    if (line.search(/^:|\s+:/) != -1) {
        match = line.match(/(.*?)(?:^:|\s+:)(.*)/);
        middle = match[1].trimRight();
        trailing = match[2];
    }
    else {
        middle = line;
    }

    if (middle.length)
        message.args = middle.split(/ +/);

    if (typeof (trailing) != 'undefined' && trailing.length)
        message.args.push(trailing);

    return message;
}
