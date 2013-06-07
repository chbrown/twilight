'use strict'; /*jslint node: true, es5: true, indent: 2 */
var util = require('util');
var stream = require('stream');

var Rechunker = module.exports = function(opts) {
  if (opts === undefined) opts = {};
  this.split_byte = (opts.split || '\n').charCodeAt(0);
  opts.decodeStrings = true;
  stream.Transform.call(this, opts);
};
util.inherits(Rechunker, stream.Transform);

Rechunker.prototype._transform = function(chunk, encoding, callback) {
  // assert encoding == 'buffer'
  var buffer = (this._buffer && this._buffer.length) ? Buffer.concat([this._buffer, chunk]) : chunk;
  var start = 0;
  var end = buffer.length;
  for (var i = 0; i < end; i++) {
    if (buffer[i] === this.split_byte) {
      this._chunk(buffer.slice(start, i), encoding);
      start = i + 1;
    }
  }
  this._buffer = buffer.slice(start);
  callback();
};

Rechunker.prototype._flush = function(callback) {
  if (this._buffer && this._buffer.length)
    this._chunk(this._buffer);
  callback();
};
