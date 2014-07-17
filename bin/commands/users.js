#!/usr/bin/env node
/*jslint node: true */
var logger = require('loge');
var api = require('../../api');

module.exports = function(argv) {
  var optimist = require('optimist')
    .usage('Usage: twilight users < screen_names.txt')
    .describe({
      accounts: 'filepath of twitter oauth csv',
    })
    .default({
      accounts: '~/.twitter',
    });

  argv = optimist.argv;

  process.stdin.resume();
  api.userStream(process.stdin, function(err) {
    if (err) {
      logger.error('userStream Error: %s', err);
    }

    process.exit(0);
  });
};
