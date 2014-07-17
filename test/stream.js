'use strict'; /*jslint node: true, es5: true, indent: 2 */
var tap = require('tap');

var twilight = require('..');
var credentials = require('../credentials');
var stream = require('../stream');

tap.test('twitter-curl', function(t) {
  var twitter_stream = new stream.TwitterStream({
    // ttv2: true,
    filter: 'track=bieber',
    interval: 600,
  });

  credentials.getOAuth('~/.twitter', function(err, oauth) {
    if (err) throw err;
    twitter_stream.options.oauth = oauth;
    twitter_stream.start();
  });

  t.plan(2);

  var haystack = '';
  twitter_stream.on('data', function(chunk) {
    haystack += chunk.toString();
  });
  twitter_stream.on('error', function(err) {
    t.equal(err.message, 'Elapsed lifetime of 2s.', 'error should be a hard timeout');
  });
  twitter_stream.on('end', function() {
    console.error('ending...');
    // t.ok(err, 'api.stream should timeout');
    t.similar(haystack, /justin/i,
      'rest call output should contain expected string.');
    t.end();

    // we shouldn't have to exit manually
    // process.exit(1);
  });

  // timeout: 2, // this is unusual, but for testing...
  setTimeout(function() {
    twitter_stream.shutdown(new Error('Elapsed lifetime of 2s.'));
  }, 2000);
});
