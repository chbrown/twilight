'use strict'; /*jslint node: true, es5: true, indent: 2 */
var fs = require('fs');
var stream = require('stream');
var test = require('tap').test;

var twitter_curl = require('../bin/twitter-curl').curl;
var twitter_rest = require('../bin/twitter-rest').rest;

test('import', function (t) {
  t.ok(twitter_curl !== undefined, 'curl should load from ../bin/twitter-curl');
  t.ok(twitter_rest !== undefined, 'rest should load from ../bin/twitter-rest');
  t.end();
});

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

    t.notOk(err, '1. curl should not raise an error');
    var haystack = '';
    output.on('data', function(chunk) {
      haystack += chunk.toString();
    });
    output.on('error', function(err) {
      t.equal(err.message, 'Elapsed lifetime of 2s.', '2. error is not timeout');
    });
    output.on('end', function() {
      var needle = 'justin';
      t.ok(haystack.indexOf(needle) > -1,
        '3. Rest call output does not contain expected string. "' + needle + '" not in ' + haystack + '.');
    });
  });
});

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
