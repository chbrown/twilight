'use strict'; /*jslint node: true, es5: true, indent: 2 */
var test = require('tap').test;

var twitter_rest = require('../bin/twitter-rest').rest;

test('twitter-rest', function (t) {
  var opts = {accounts: '~/.twitter'};
  twitter_rest('/1.1/geo/id/1d9a5370a355ab0c.json', opts, function(err, response) {
    var haystack = '';
    response.on('data', function(chunk) {
      haystack += chunk.toString();
    });

    response.on('end', function() {
      var needle = 'Chicago, IL';
      t.ok(haystack.indexOf(needle) > -1,
        'Rest call output does not contain expected string. "' + needle + '" not in ' + haystack + '.');
      t.end();
    });
  });
});
