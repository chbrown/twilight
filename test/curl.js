'use strict'; /*jslint node: true, es5: true, indent: 2 */
var test = require('tap').test;

var twitter_curl = require('../bin/twitter-curl').curl;

test('twitter-curl', function (t) {
  var opts = {
    accounts: '~/.twitter',
    ttv2: true,
    filter: 'track=bieber',
    interval: 600,
    timeout: 2, // this is unusual, but for testing...
  };

  twitter_curl(opts, function(err, output) {
    t.plan(3);

    t.notOk(err, 'curl should not raise an error');
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
