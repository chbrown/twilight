'use strict'; /*jslint node: true, es5: true, indent: 2 */
var util = require('util');
var stream = require('stream');

var TimeoutDetector = module.exports = function(opts) {
  if (!opts || !opts.timeout) throw new Error('TimeoutDetector({timeout: ...}) is a required parameter.');
  stream.Transform.call(this, opts);
  this.timeout_ms = opts.timeout * 1000;
  setInterval(this._check.bind(this), this.timeout_ms);
};
util.inherits(TimeoutDetector, stream.Transform);

TimeoutDetector.prototype._check = function() {
  // silent_ms: milliseconds since we got some incoming data
  var silent_ms = Date.now() - this.last;
  if (silent_ms > this.timeout_ms) {
    // ensure we get something every x seconds.
    this.emit('error', new Error('TimeoutDetector timed out.'));
  }
};

TimeoutDetector.prototype._transform = function(chunk, encoding, callback) {
  this.last = Date.now();
  this.push(chunk);
  callback();
};
