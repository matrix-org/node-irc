import { CommandType, replyCodes } from './codes';
import { stripColorsAndStyle } from './colors';

export interface Message {
    prefix?: string;
    server?: string;
    nick?: string;
    user?: string;
    host?: string;
    args: string[];
    command?: string;
    rawCommand?: string;
    commandType: CommandType;
}

/**
 * parseMessage(line, stripColors)
 *
 * takes a raw "line" from the IRC server and turns it into an object with
 * useful keys
 * @param line Raw message from IRC server.
 * @param stripColors If true, strip IRC colors.
 * @return A parsed message object.
 */
export function parseMessage(line: string, stripColors: boolean): Message {
    const message: Message = {
        args: [],
        commandType: 'normal',
    };
    if (stripColors) {
        line = stripColorsAndStyle(line);
    }

    // Parse prefix
    let match = line.match(/^:([^ ]+) +/);
    if (match) {
        message.prefix = match[1];
        line = line.replace(/^:[^ ]+ +/, '');
        const userDelim = message.prefix.indexOf('!');
        const hostDelim = message.prefix.indexOf('@');
        if (userDelim !== -1 && hostDelim !== -1) {
            message.nick = message.prefix.substring(0, userDelim);
            message.user = message.prefix.substring(userDelim+1, hostDelim);
            message.host = message.prefix.substring(hostDelim+1);
        }
        else if (userDelim === -1 && hostDelim !== -1) {
            // I don't think we'll get here, but we could if someone sends user@server
            message.nick = message.prefix.substring(0, hostDelim);
            message.user = undefined;
            message.host = message.prefix.substring(hostDelim+1);
        }
        else {
            message.server = message.prefix;
        }
    }

    // Parse command
    match = line.match(/^([^ ]+) */);
    message.command = match?.[1];
    message.rawCommand = match?.[1];
    line = line.replace(/^[^ ]+ +/, '');
    if (message.rawCommand && replyCodes[message.rawCommand]) {
        message.command = replyCodes[message.rawCommand].name;
        message.commandType = replyCodes[message.rawCommand].type;
    }

    let middle, trailing;

    // Parse parameters
    if (line.search(/^:| +:/) !== -1) {
        match = line.match(/(.*?)(?:^:| +:)(.*)/);
        if (!match) {
            throw Error('Invalid format, could not parse parameters');
        }
        middle = match[1].trimEnd();
        trailing = match[2];
    }
    else {
        middle = line;
    }

    if (middle.length) {message.args = middle.split(/ +/);}

    if (typeof (trailing) !== 'undefined' && trailing.length) {message.args.push(trailing);}

    return message;
}
