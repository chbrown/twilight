#!/usr/bin/env node
/*jslint node: true */
var fs = require('fs');
var https = require('https');
var logger = require('loge');
var path = require('path');
var querystring = require('querystring');
var request = require('request');
var stream = require('stream');
var streaming = require('streaming');
var sv = require('sv');
var url = require('url');
var util = require('util');

var twilight = require('../');

var TwitterError = function(incoming_message, body) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'TwitterError';
  this.incoming_message = incoming_message;
  this.statusCode = this.incoming_message.statusCode;
  this.message = 'Twitter HTTP Error ' + this.statusCode;
  this.body = body;
};
TwitterError.prototype.toString = function() {
  return this.message + ' ' + util.inspect(this.body);
};


var Batcher = module.exports = function(batch_length) {
  stream.Transform.call(this, {objectMode: true});
  this.batch_length = batch_length;
  this.batch_buffer = [];
};
util.inherits(Batcher, stream.Transform);
Batcher.prototype.checkFlush = function(end, callback) {
  // checkFlush is called by both _transform and _flush,
  // with different `end` values.
  if (this.batch_buffer.length >= this.batch_length || (this.batch_buffer.length > 0 && end)) {
    // splice(index, number_to_remove, number_to_insert) returns the removed items
    var batch = this.batch_buffer.splice(0, this.batch_length);
    this.push(batch);
  }
  callback();
};
Batcher.prototype._transform = function(chunk, encoding, callback) {
  this.batch_buffer.push(chunk);
  this.checkFlush(false, callback);
};
Batcher.prototype._flush = function(callback) {
  this.checkFlush(true, callback);
};



var fetch_ids = function(url, ids, callback) {
  twilight.getOAuth('~/.twitter', function(err, oauth) {
    if (err) return callback(err);
    request({
      method: 'POST',
      url: url,
      oauth: oauth,
      timeout: 10000,
      json: true,
      form: {
        id: ids.join(','),
        trim_user: false,
        // map: true,
      },
    }, function(err, response, body) {
      if (err) return callback(err);
      if (response.statusCode != 200) {
        return callback(new TwitterError(response, body));
      }
      callback(null, body);
    });
  });
};

var fetch_ids_retry = function(url, ids, callback) {
  fetch_ids(url, ids, function(err, response) {
    if (err && err instanceof TwitterError && err.statusCode == 403) {
      logger.debug('TwitterError 403, retrying');
      return fetch_ids_retry(url, ids, callback);
    }
    callback(err, response);
  });
};


var streamCommand = exports.streamCommand = function(argv, callback) {
  var url;
  if (argv.users) {
    url = 'https://api.twitter.com/1.1/users/lookup.json';
  }
  else if (argv.statuses) {
    url = 'https://api.twitter.com/1.1/statuses/lookup.json';
  }

  process.stdin.resume();
  var batch_input = process.stdin
    .pipe(new streaming.Splitter())
    .pipe(new Batcher(100));

  batch_input.on('end', function() {
    callback();
    // logger.info('batch_input->end');
  });

  (function loop() {
    // (function loop(batch) {
    // if (batch === undefined) {
    //   batch = batch_input.read();
    // }
    var batch = batch_input.read();
    if (batch === null) {
      // no available data; wait
      batch_input.once('readable', function() {
        // logger.info('batch_input->readable (1x)');
        loop();
      });
    }
    else {
      // logger.info('reading batch (N=%d)', batch.length);
      fetch_ids_retry(url, batch, function(err, response) {
        if (err) return callback(err);
        // console.log('found ' + response.length);
        response.forEach(function(obj) {
          console.log(JSON.stringify(obj));
        });
        loop();
        // setImmediate(loop);
      });
    }
  })();
};

function main() {
  var full = require('optimist')
    .usage('Usage: twitter-rest endpoint')
    .describe({
      accounts: 'filepath of twitter oauth csv',

      help: 'print this help message',
      verbose: 'print extra output',
      version: 'print version',
    })
    .boolean(['users', 'statuses', 'help', 'verbose', 'version', ])
    .alias({verbose: 'v', json: 'j'})
    .default({
      method: 'GET',
      accounts: '~/.twitter'
    });

  var argv = full.argv;
  logger.level = argv.verbose ? 'debug' : 'info';

  if (argv.help) {
    full.showHelp();
  }
  else if (argv.version) {
    console.log(require('../package').version);
  }
  else {
    streamCommand(argv, function(err) {
      if (err) logger.error(err);
      process.exit(err ? 1 : 0);
    });
  }
}

if (require.main === module) { main(); }
