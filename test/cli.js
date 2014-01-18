'use strict'; /*jslint node: true, es5: true, indent: 2 */
var tap = require('tap');

var twitter_curl = require('../bin/twitter-curl').curl;
var twitter_rest = require('../bin/twitter-rest').rest;

tap.test('import', function(t) {
  t.ok(twitter_curl, 'curl should load from ../bin/twitter-curl');
  t.ok(twitter_rest, 'rest should load from ../bin/twitter-rest');
  t.end();
});
