#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var logger = require('winston');
var request = require('request');
var sv = require('sv');
var util = require('util');

var getOAuth = exports.getOAuth = function(filepath, callback) {
  if (process.env.consumer_key && process.env.consumer_secret && process.env.access_token && process.env.access_token_secret) {
    // in testing we might want to specify all oauth credentials via the environment.
    callback(null, {
      consumer_key: process.env.consumer_key,
      consumer_secret: process.env.consumer_secret,
      token: process.env.access_token,
      token_secret: process.env.access_token_secret,
    });
  }
  else {
    // otherwise (in the normal case) get oauth account info from file
    getOAuthFromFile(filepath, callback);
  }
};

var getOAuthFromFile = exports.getOAuthFromFile = function(filepath, callback) {
  // callback signature: function(err, oauth_object)
  sv.Parser.readToEnd(filepath, {encoding: 'utf8'}, function(err, accounts) {
    if (err) {
      callback(err);
    }
    else {
      var account = accounts[Math.random() * accounts.length | 0];
      // e.g., account = {
      //   screen_name: 'leoparder',
      //   consumer_key: 'ziurk0AOdn71U63Yp9EG4',
      //   consumer_secret: 'VKmTsGrk2JjH4qcYFpaAX5iEDthoW7ZyeU03NxPS1ld',
      //   access_token: '915051675-bCH2SYP6Ok9epWwnu7A0DhrlIQBMUaoLtxVzfRG5',
      //   access_token_secret: 'VcLOIzA0mkiCSbUYDWrNv3n86EXJa4HQKMgqfd7' }
      var oauth = {
        consumer_key: account.consumer_key,
        consumer_secret: account.consumer_secret,
        // we make slight modifications to the names, because the oauth lib
        //   does not expect the "access_" prefix on the token* keys
        token: account.access_token,
        token_secret: account.access_token_secret,
      };

      logger.debug('Using OAuth: ' + JSON.stringify(oauth));
      callback(err, oauth);
    }
  });
};

exports.requestResponse = function(opts, callback) {
  // callback signature: function(err, response)
  logger.debug(opts.method + ' ' + opts.url);
  request(opts).on('response', function(res) {
    if (res.statusCode != 200) {
      res.on('end', function() {
        callback(new Error('HTTP Error ' + res.statusCode));
      }).pipe(process.stderr);
    }
    else {
      callback(null, res);
    }
  }).on('error', callback);
};
