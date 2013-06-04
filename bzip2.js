'use strict'; /*jslint node: true, es5: true, indent: 2 */
var util = require('util');
var stream = require('stream');
var gzbz2 = require('gzbz2');

var BzipDeflater = exports.BzipDeflater = function(opts) {
  if (opts === undefined) opts = {}; // {encoding: 'utf8', level: 1}
  stream.Transform.call(this, opts);

  this.bz2 = new gzbz2.Bzip();
  this.bz2.init(opts);
};
util.inherits(BzipDeflater, stream.Transform);

BzipDeflater.prototype._transform = function(chunk, encoding, callback) {
  try {
    var deflated = this.bz2.deflate(chunk, encoding);
    this.push(deflated);
  } catch (err) {
    this.emit('error', err);
  }
  callback();
};
BzipDeflater.prototype._flush = function(callback) {
  try {
    var deflated = this.bz2.end();
    this.push(deflated);
  } catch (err) {
    this.emit('error', err);
  }
  callback();
};
