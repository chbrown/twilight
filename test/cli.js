'use strict'; /*jslint node: true, es5: true, indent: 2 */
var test = require('tap').test;

var twitter_curl = require('../bin/twitter-curl').curl;
var twitter_rest = require('../bin/twitter-rest').rest;

test('import', function(t) {
  t.ok(twitter_curl, 'curl should load from ../bin/twitter-curl');
  t.ok(twitter_rest, 'rest should load from ../bin/twitter-rest');
  t.end();
});
