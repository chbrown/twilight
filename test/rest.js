'use strict'; /*jslint node: true, es5: true, indent: 2 */
var tap = require('tap');
var streaming = require('streaming');

var twilight = require('..');
var twitter_rest = require('../bin/twitter-rest').rest;

tap.test('twitter-rest', function(t) {
  twilight.getOAuth('~/.twitter', function(err, oauth) {
    t.notOk(err, 'getOAuth should not raise an error');
    twitter_rest('/1.1/geo/id/1d9a5370a355ab0c.json', {oauth: oauth}, function(err, response) {
      streaming.readToEnd(response, function(err, chunks) {
        t.notOk(err, 'twitter rest api call should not raise an error');
        t.similar(chunks.join(''), /Chicago, IL/,
          'Rest call output does not contain expected string, "Chicago, IL".');
        t.end();
      });
    });
  });
});
