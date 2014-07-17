/*jslint node: true */
var util = require('util');

var TwitterError = exports.TwitterError = function(incoming_message, body) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'TwitterError';
  this.incoming_message = incoming_message;
  this.statusCode = this.incoming_message.statusCode;
  this.message = 'Twitter HTTP Error ' + this.statusCode;
  this.body = body;
};
TwitterError.prototype.toString = function() {
  return this.message + ' ' + util.inspect(this.body);
};
