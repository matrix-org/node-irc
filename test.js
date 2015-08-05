#!/usr/bin/env node

var irc  = require('./lib/irc.js');
var util = require('util');

var ircServer = process.argv[2] || process.env.IRCSERVER || 'localhost';

console.log('Starting IRC connection to', ircServer, 'with REPL');

var c = new irc.Client(
    ircServer,
    'nodebot',
    {
        channels: ['#test'],
        debug: true
    }
);

var messages = [];
c.addListener('raw', function(message) { messages.push(message); });
c.addListener('unhandled', function(message) {
  console.log('unhandled: ', message);
});
c.addListener('error', function(message) { console.log('error: ', message); });

function printRecent(number) {
  number = number || 1;
  var toPrint = messages.slice(messages.length-number, messages.length);
  toPrint.forEach(function(message) {
    console.log(message);
  });
}

var repl = require('repl').start('> ');
repl.context.repl = repl;
repl.context.util = util;
repl.context.irc = irc;
repl.context.c = c;
repl.context.printRecent = printRecent;
repl.context.recent = printRecent;

repl.addListener('exit', function() {
    console.log("\nClosing session");
    c.disconnect('Closing session');
});
