#!/usr/bin/env node
/*jslint node: true */
var logger = require('loge');
var streaming = require('streaming');
var fs = require('fs');
var api = require('../../api');

var start = function(input_stream, output_stream) {
  var stream = input_stream
    .pipe(new streaming.Batcher(100))
    .pipe(new api.StatusStream())
    .on('error', function(err) {
      logger.error('api.StatusStream error', err);
    })
    // .pipe(new streaming.Mapper(function(statuses) {}))
    .pipe(new streaming.json.Stringifier())
    .pipe(output_stream);

  stream.on('end', function() {
    process.exit(0);
  });
};

module.exports = function(argv) {
  /**
  STDIN should be a newline-separated list of status IDs
  */
  var optimist = require('optimist')
    .usage('Usage: twilight statuses < ids.txt')
    .describe({
      accounts: 'filepath of twitter oauth csv',
      output: 'tweet destination file (defaults to STDOUT)',
    })
    .default({
      accounts: '~/.twitter',
    })
    .alias({output: 'o'});

  argv = optimist.argv;

  process.stdin.resume();
  var input_stream = process.stdin.pipe(new streaming.Splitter());
  input_stream.setEncoding('utf8');

  if (argv.output) {
    logger.info('Reading existing tweets from "%s"', argv.output);

    var fetched_ids = {};
    var fetched_stream = fs.createReadStream(argv.output, {flags: 'r', encoding: 'utf8'})
      .on('error', function(err) {
        var output_stream = fs.createWriteStream(argv.output, {flags: 'a', encoding: 'utf8'});
        start(input_stream, output_stream);
      })
      .pipe(new streaming.json.Parser())
      .on('data', function(status) {
        fetched_ids[status.id_str] = 1;
      })
      .on('end', function() {
        logger.info('Found %d tweets in "%s"', Object.keys(fetched_ids).length, argv.output);

        input_stream = input_stream.pipe(new streaming.Filter(function(status_id) {
          return fetched_ids[status_id] === undefined;
        }));

        var output_stream = fs.createWriteStream(argv.output, {flags: 'a', encoding: 'utf8'});
        start(input_stream, output_stream);
      });
  }
  else {
    start(input_stream, process.stdout);
  }
};
