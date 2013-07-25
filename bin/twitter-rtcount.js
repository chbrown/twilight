#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var util = require('util');
var Rechunker = require('../rechunker');

// Usage:
// just stream newline-separated json tweets through it.
// Ctrl+C when necessary or will exit when STDIN ends.

var started = Date.now();
var retweet_count = 0;
var retweets = {};
function _tweet(tweet) {
  if (tweet.text.match(/RT/)) {
    var text = tweet.text.replace(/\s+/g, ' '); // brutal
    retweets[text] = retweets[text] || {text: text, dates: []};
    var ticks = Date.parse(tweet.created_at);
    retweets[text].dates.push(ticks);
    retweet_count++;

    var elapsed = (Date.now() - started) / 1000 | 0;
    process.stderr.write('\rFound ' + retweet_count + ' RTs in ' + elapsed + 's.');
  }
}

var Reader = function() {
  Rechunker.call(this, {objectMode: true, split: '\n'});
};
util.inherits(Reader, Rechunker);
Reader.prototype._chunk = function(chunk, encoding, callback) {
  encoding = encoding == 'buffer' ? 'utf8' : encoding;
  var line = Buffer.isBuffer(chunk) ? chunk.toString() : chunk;
  try {
    // the constructor isn't heeding options of {encoding: 'utf8', decodeStrings: false}
    var obj = JSON.parse(line);
    if (obj && obj.text) {
      _tweet(obj);
    }
  } catch (err) {
    this.emit('error', err);
  }
};

var reader = new Reader();
process.stdin.pipe(reader).on('end', end);

function end() {
  process.stderr.write('\r\n');
  var retweets_array = [];
  for (var text in retweets) {
    retweets_array.push(retweets[text]);
  }
  // console.log(retweets_array.toString());

  retweets_array.sort(function(a, b) {
    return a.dates.length - b.dates.length;
  }).forEach(function(retweet) {
    // if (retweet.dates.length > 1)
    console.log(retweet.dates.length + '\t' + retweet.text + '\t' + retweet.dates.join(','));
  });

  process.exit();
}

process.on('SIGINT', function() {
  console.error("Ctrl+C :: SIGINT!");
  end();
});
