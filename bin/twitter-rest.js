#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var fs = require('fs');
var logger = require('winston');
var path = require('path');
var querystring = require('querystring');
var request = require('request');
var sv = require('sv');
var url = require('url');

var twilight = require('../index');

var rest = exports.rest = function(urlStr, opts, callback) {
  // callback signature: function(err, readable_stream)
  twilight.getOAuth(opts.accounts, function(err, oauth) {
    if (err) {
      callback(err);
    }
    else {
      var urlObj = url.parse(urlStr);
      urlObj.protocol = 'https:';
      urlObj.host = urlObj.hostname = 'api.twitter.com';
      urlObj.pathname = '/1.1' + urlObj.pathname.replace(/^(\/?1\.[01])?/, '');

      var request_opts = {
        url: urlObj,
        method: opts.method,
        oauth: oauth,
        timeout: opts.timeout,
      };

      request_opts[opts.method == 'POST' ? 'form' : 'qs'] = opts.data ? querystring.parse(opts.data) : undefined;
      logger.debug(request_opts.method + ' ' + url.format(request_opts.url));

      request(request_opts).on('response', function(response) {
        if (response.statusCode != 200) {
          response.on('end', function() {
            var err = new Error('HTTP Error ' + response.statusCode);
            callback(err);
          });
        }
        else {
          if (opts.json) {
            response = response.pipe(new twilight.JSONPrettifier());
          }
          callback(null, response);
        }
      });
    }
  });
};

function main() {
  var full = require('optimist')
    .usage('Usage: twitter-rest endpoint')
    .describe({
      method: 'GET or POST',
      data: 'querystring-encoded data to send',
      timeout: 'timeout period (milliseconds)',

      json: 'prettify json output',
      accounts: 'filepath of twitter oauth csv',

      help: 'print this help message',
      verbose: 'print extra output',
      version: 'print version',
    })
    .boolean(['help', 'verbose', 'version'])
    .alias({verbose: 'v', json: 'j'})
    .default({
      method: 'GET',
      accounts: '~/.twitter'
    });

  var argv = full.argv;
  logger.level = argv.verbose ? 'debug' : 'info';

  if (argv.help) {
    full.showHelp();
  }
  else if (argv.version) {
    var package_json_path = path.join(__dirname, '../package.json');
    fs.readFile(package_json_path, 'utf8', function(err, data) {
      var obj = JSON.parse(data);
      console.log(obj.version);
    });
  }
  else {
    rest(argv._[0], argv, function(err, response) {
      if (err) {
        logger.debug(err.toString());
        throw err;
      }
      else {
        // set the destination stream here so that rest() is more easily tested
        response.pipe(process.stdout);
      }
    });
  }
}

if (require.main === module) { main(); }
