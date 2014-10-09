#!/usr/bin/env node
/*jslint node: true */
var logger = require('loge');
var querystring = require('querystring');
var streaming = require('streaming');
var url = require('url');

var twilight = require('../..');


module.exports = function(argv) {
  var optimist = require('optimist')
    .usage('Usage: twilight rest <endpoint>')
    .describe({
      method: 'GET or POST',
      data: 'querystring-encoded data to send',
      timeout: 'timeout period (milliseconds)',

      json: 'prettify json output',
      accounts: 'filepath of twitter oauth csv',
    })
    .boolean(['json'])
    .alias({verbose: 'v', json: 'j'})
    .default({
      method: 'GET',
      accounts: '~/.twitter'
    });

  argv = optimist.argv;

  /** rest: make a http(s) call against the Twitter API

  `urlStr`: String
  `opts`: Object
      `method`: String (optional)
      `oauth`: Object
          ... see "twitter-curl.js"
      `timeout`: Number (optional)
      `data`: String (optional)
      `json`: Boolean (optional)
          JSONize output
  `callback`: function(err, readable_stream)
  */
  var urlStr = argv._[1];

  var urlObj = url.parse(urlStr);
  urlObj.protocol = 'https:';
  urlObj.host = urlObj.hostname = 'api.twitter.com';
  urlObj.pathname = '/1.1' + urlObj.pathname.replace(/^(\/?1\.[01])?/, '');

  var request_opts = {
    url: url.format(urlObj),
    method: argv.method,
    // oauth: opts.oauth,
    timeout: argv.timeout,
    json: true,
    // data: argv.data,
  };

  request_opts[argv.method == 'POST' ? 'form' : 'qs'] = argv.data ? querystring.parse(argv.data) : undefined;
  logger.debug(request_opts.method + ' ' + url.format(request_opts.url), request_opts);

  // credentials.getOAuth(argv.accounts, function(err, oauth) {
  twilight.requestWithOAuth(request_opts, function(err, response) {
    if (err) {
      console.error(err.toString());
      throw err;
    }

    streaming.readToEnd(response, function(err, chunks) {
      if (err) throw err;

      var body = chunks.join('');
      var obj = JSON.parse(body);
      var str = JSON.stringify(obj, null, '  ');
      console.log(str);
      // process.exit(0);
    });

  });
  // response = response
  // .pipe(new streaming.json.Parser())
  // .pipe(new streaming.json.Stringifier(null, '  '));
  // response.pipe(process.stdout);
};
