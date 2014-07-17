/*jslint node: true */
var _ = require('underscore');
var querystring = require('querystring');
var request = require('request');
var stream = require('stream');
var zlib = require('zlib');
var util = require('util');

var logger = require('loge');
var streaming = require('streaming');

var errors = require('./errors');
// var twilight = require('..');
// var tweet = require('../tweet');

var decompressStream = function(stream, encoding) {
  if (encoding == 'gzip') {
    logger.debug('gunzipping HTTP response');
    var gunzip = zlib.createGunzip();
    return stream.pipe(gunzip);
  }

  if (encoding == 'deflate') {
    logger.debug('inflating HTTP response');
    var inflate = zlib.createInflate();
    return stream.pipe(inflate);
  }

  logger.info('Not (un)wrapping HTTP response with encoding "%s"', encoding);
  return stream;
};

var TwitterStream = exports.TwitterStream = function(opts) {
  /** TwitterStream start an infinite twitter stream (unless it times out,
  or people quit posting to twitter).

  `opts`: Object
      `filter`: String (optional)
          Form like "track=this" or "locations=those", etc.
      `sample`: String (optional)
          Query like "language=en", etc.
      `oauth`: Object (required)
          `consumer_key`: String
          `consumer_secret`: String
          `token`: String
          `token_secret`: String
      `interval`: Integer (required)
          Die after this many seconds of silence.
      `useragent`: String (optional)
          User-Agent header value to send to Twitter
      `compress`: Boolean (default: false)
          Ask for gzip compression from Twitter
      `decompress`: Boolean (default: true)
          Decompress a gzip-compressed response.
          Not applicable if `compress` == false (or if Twitter decides not to respect the content-encoding header).
          Coerced to true if `ttv2` == true.
  */
  stream.PassThrough.call(this, {objectMode: false});

  this.options = _.extend({
    timeout: false,
    decompress: false,
    interval: 86400,
  }, opts);


  this.url = 'https://stream.twitter.com/1.1/statuses/' +
    (opts.filter ? 'filter' : 'sample') + '.json';
  this.data = querystring.parse(opts.filter || opts.sample || '');

  // Prepare request headers. The User-Agent header is required, if we want
  // to have Twitter respect our accept-encoding value.
  this.headers = {
    headers: {
      'User-Agent': opts.useragent
    },
  };
  if (opts.compress) {
    this.headers['Accept-Encoding'] = 'deflate, gzip';
  }
};
util.inherits(TwitterStream, stream.PassThrough);
TwitterStream.prototype.start = function() {
  logger.debug('POST ' + this.url);

  var self = this;
  this.request = request({
    url: this.url,
    method: 'POST',
    headers: this.headers,
    form: this.data,
    oauth: this.options.oauth,
  })
  .on('response', function(response) {
    logger.debug('response (%d) headers', response.statusCode, response.headers);
    self.response = response;
    // consider every status code != 200 fatal
    if (response.statusCode != 200) {
      streaming.readToEnd(response, function(err, chunks) {
        if (!err) {
          var body = chunks.join('');
          err = new errors.TwitterError(response, body);
        }
        self.shutdown(err);
      });
    }
    else {
      // Decompress if needed. This must run from within the response
      // listener since we need the response headers.
      if (self.options.decompress) {
        var encoding = response.headers['content-encoding'];
        response = decompressStream(response, encoding);
      }

      // 5. streaming.Timeout(x): ensure we get something every x seconds.
      var timeout_detector = new streaming.Timeout(self.options.interval);
      // timeout_detector.on('error', shutdown);
      response = response.pipe(timeout_detector);

      response.pipe(self);
    }
  })
  .on('error', function(err) {
    self.shutdown(err);
  });
};
TwitterStream.prototype.shutdown = function(err) {
  logger.error('shutdown', err);
  // if (this.request) {
  //   this.request.abort();
  // }
  this.emit('error', err);
  this.push(null);
};
