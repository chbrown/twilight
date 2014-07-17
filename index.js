/*jslint node: true */
var _ = require('underscore');
var logger = require('loge');
var request = require('request');
var streaming = require('streaming');

var errors = require('./errors');
var credentials = require('./credentials');

var requestWithOAuth = exports.requestWithOAuth = function(opts, callback) {
  /**
  callback signature: function(Error | null, response)
  */
  credentials.getOAuth('~/.twitter', function(err, oauth) {
    if (err) return callback(err);

    var options = _.extend({oauth: oauth}, opts);

    logger.debug('Authenticated request: %j', options);

    request(options)
    .on('response', function(response) {
      if (response.statusCode != 200) {
        streaming.readToEnd(response, function(err, chunks) {
          if (err) return callback(err);

          var body = chunks.join('');
          callback(new errors.TwitterError(response, body));
        });
      }
      else {
        callback(null, response);
      }
    })
    .on('error', callback);
  });
};

var requestWithOAuthUntilSuccess = exports.requestWithOAuthUntilSuccess = function(opts, callback) {
  requestWithOAuth(opts, function(err, response) {
    if (err && err instanceof errors.TwitterError && err.statusCode == 403) {
      logger.debug('%s, retrying', err.message);
      return requestWithOAuthUntilSuccess(opts, callback);
    }
    callback(err, response);
  });
};

// exports.request = function(options, callback) {
//   request(options, function(err, response, body) {
//     if (err) {
//       callback(err);
//     }
//     else if (response.statusCode != 200) {
//       callback(new errors.TwitterError(response, body));
//     }
//     else {
//       callback(null, body);
//     }
//   });
// };
