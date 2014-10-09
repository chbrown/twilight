#!/usr/bin/env node
/*jslint node: true */
var logger = require('loge');
var streaming = require('streaming');
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
  var stream = process.stdin
    .pipe(new streaming.Splitter())
    .pipe(new streaming.Batcher(100))
    .pipe(new api.UserStream())
    .pipe(new streaming.json.Stringifier())
    .pipe(process.stdout);

  stream.on('end', function() {
    process.exit(0);
  });
};
