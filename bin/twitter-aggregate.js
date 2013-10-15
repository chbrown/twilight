#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var child_process = require('child_process');
var os = require('os');
var async = require('async');
var path = require('path');
var glob = require('glob');
var streaming = require('streaming');
var redis = require('redis');


function RedisBuffer() {
  this._store = {};
}
RedisBuffer.prototype.incr = function(key) {
  this.incrby(key, 1);
};
RedisBuffer.prototype.incrby = function(key, increment) {
  this._store[key] = (this._store[key] || 0) + increment;
};
RedisBuffer.prototype.hincr = function(key, field) {
  this.hincrby(key, field, 1);
};
RedisBuffer.prototype.hincrby = function(key, field, increment) {
  if (!this._store[key]) {
    this._store[key] = {};
  }
  this._store[key][field] = (this._store[key][field] || 0) + increment;
};
RedisBuffer.prototype.flush = function(redis_client, callback) {
  var store = this._store;
  this._store = {};
  async.each(Object.keys(store), function(key, next) {
    var value = store[key];
    if (isNaN(value)) {
      async.each(Object.keys(value), function(field, next2) {
        redis_client.hincrby(key, field, value[field], next2);
      }, next);
    }
    else {
      redis_client.incrby(key, value, next);
    }
  }, callback);
};

/* Database:

    twitteragg:read                     set of filenames we've read
    twitteragg:failed                   set of filenames we made errors in

    twitteragg:{name}                   int, total count for this name
    twitteragg:{name}/rt                int, total RT's captured
    twitteragg:{name}/lang              hash(lang -> int) total tweets in "lang"

    twitteragg:{name}:{datehour}        int, total count for that hour
    twitteragg:{name}:{datehour}/rt     int, RT's in that hour
    twitteragg:{name}:{datehour}/lang   hash(lang -> int) tweets in "lang" for that hour */

function readFile(filepath, r, callback) {
  var filename = path.basename(filepath);
  var named_prefix = 'twitteragg:' + filename.split('_')[0];

  process.stderr.write('         ' + filename);
  var nrows = 0;

  child_process.spawn('bzcat', [filepath], {
    stdio: ['ignore', 'pipe', process.stderr]
  }).stdout.pipe(new streaming.Splitter())
  .on('end', function() {
    console.error('\r' + nrows + '\n');
    callback();
  })
  .on('data', function(chunk) {
    var line = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
    nrows++;

    // console.log('line-->', line);
    var parts = line.trim().split(/\t/g);
    var dated_prefix = named_prefix + ':' + parts[1].slice(0, 11);

    async.each([named_prefix, dated_prefix], function(prefix, callback) {
      r.incr(prefix, function(err) {
        if (err) console.error(err);
        r.hincrby(prefix + '/lang', parts[24], 1, function(err) {
          if (err) console.error(err);
          if (parts[2].slice(0, 2) == 'RT') {
            r.incr(prefix + '/rt', callback);
          }
          else {
            callback();
          }
        });
      });
    });

    if (nrows % 1000 === 0) {
      process.stderr.write('\r' + nrows);
    }
  });
}

var r = redis.createClient();
var rbuffer = new RedisBuffer();
glob('/data/chbrown/twitter/*.ttv2.bz2', function(err, ttv2_filepaths) {
  if (err) console.error(err);
  async.eachLimit(ttv2_filepaths, 2, function(ttv2_filepath, callback) {
    var ttv2_filename = path.basename(ttv2_filepath);
    r.sadd('twitteragg:read', ttv2_filename, function(err, novel) {
      if (err) console.error(err);
      if (novel == 1) {
        readFile(ttv2_filepath, rbuffer, function(err) {
          rbuffer.flush(r, callback);
        });
      }
      else {
        console.error(ttv2_filename + ' already read');
        callback();
      }
    });
  }, function(err) {
    if (err) console.error(err);
    process.exit();
  });
});
