'use strict'; /*jslint node: true, es5: true, indent: 2 */
var tap = require('tap');

var twilight = require('..');
var twitter_curl = require('../bin/twitter-curl').curl;

tap.test('twitter-curl', function(t) {
  twilight.getOAuth('~/.twitter', function(err, oauth) {
    t.plan(3);

    t.notOk(err, 'getOAuth should not raise an error');
    var output = twitter_curl({
      oauth: oauth,
      ttv2: true,
      filter: 'track=bieber',
      interval: 600,
      timeout: 2, // this is unusual, but for testing...
    });

    var haystack = '';
    output.on('data', function(chunk) {
      haystack += chunk.toString();
    });
    output.on('error', function(err) {
      t.equal(err.message, 'Elapsed lifetime of 2s.', 'error should not be a timeout');
    });
    output.on('end', function() {
      t.similar(haystack, /justin/i,
        'rest call output should contain expected string.');
      // we shouldn't have to exit manually, but it's not a big deal
      process.exit();
    });
  });
});
