'use strict'; /*jslint node: true, es5: true, indent: 2 */
var tap = require('tap');

var api_rest = require('../api/rest');
// var api_stream = require('../api/stream');

tap.test('import', function(t) {
  t.ok(api_rest, 'rest should load from ../api/rest');
  // t.ok(api_stream, 'stream should load from ../api/stream');
  t.end();
});
