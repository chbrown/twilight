/*jslint node: true */
var logger = require('loge');
var path = require('path');
var querystring = require('querystring');
var request = require('request');
var stream = require('stream');
var streaming = require('streaming');
var sv = require('sv');
var url = require('url');
var util = require('util');

var twilight = require('..');
var errors = require('../errors');
var credentials = require('../credentials');

var UserStream = exports.UserStream = function() {
  stream.Transform.call(this, {objectMode: true});
};
util.inherits(UserStream, stream.Transform);
UserStream.prototype._transform = function(chunk, encoding, callback) {
  var self = this;
  twilight.requestWithOAuthUntilSuccess({
    method: 'POST',
    // url: 'https://api.twitter.com/1.1/statuses/lookup.json',
    url: 'https://api.twitter.com/1.1/users/lookup.json',
    timeout: 10000,
    form: {
      // for now assume they're all screen names
      screen_name: chunk.join(','),
    },
  }, function(err, response) {
    if (err) return callback(err);

    streaming.readToEnd(response, function(err, chunks) {
      if (err) return callback(err);

      var body = chunks.join('');
      JSON.parse(body).forEach(function(obj) {
        self.push(obj);
      });
      callback();
    });
  });
};

var StatusStream = exports.StatusStream = function() {
  stream.Transform.call(this, {objectMode: true});
};
util.inherits(StatusStream, stream.Transform);
StatusStream.prototype._transform = function(id_strs, encoding, callback) {
  /** encoding should be null; id_strs is the Array of status id strings

  The lookup endpoint returns a list of {<tweet>} objects by default.
  When map is "true", it returns a payload like: {id: { "123": {<tweet>}, "456": {<tweet>} } }
  */
  var self = this;
  twilight.requestWithOAuthUntilSuccess({
    method: 'POST',
    url: 'https://api.twitter.com/1.1/statuses/lookup.json',
    timeout: 10000,
    form: {
      map: true,
      id: id_strs.join(','),
    },
  }, function(err, response) {
    if (err) {
      self.emit('error', err);
      return callback();
    }

    streaming.readToEnd(response, function(err, chunks) {
      if (err) {
        self.emit('error', err);
        return callback();
      }

      var body = chunks.join('');
      var statuses_map = JSON.parse(body).id;

      var statuses = id_strs.map(function(id_str) {
        // statuses_map[id_str] will be null for all requested statuses that can't be found
        var status = statuses_map[id_str];
        return status === null ? {id_str: id_str.toString(), missing: true} : status;
      });

      logger.info('Fetched %d statuses', statuses.length);
      statuses.forEach(function(status) {
        self.push(status);
      });
      callback();
    });
  });
};


exports.getUsers = function(users, callback) {
  /** Get the user objects for a list of user_ids and/or screen_names.

  users is a list of {id_str: '18116587'} or {screen_name: 'chbrown'} objects

  This API method can only handle 100 screen_names at a time

  callback: function(Error | null, Array[Object] | null)
  */
  function attrFunc(attr) {
    return function(obj) { return obj[attr]; };
  }
  // apparently Twitter is happy with both
  var form = {
    user_id: users.filter(attrFunc('id_str')).map(attrFunc('id_str')).join(','),
    screen_name: users.filter(attrFunc('screen_name')).map(attrFunc('screen_name')).join(','),
  };

  twilight.requestWithOAuth({
    method: 'POST',
    url: 'https://api.twitter.com/1.1/users/lookup.json',
    timeout: 10000,
    json: true,
    form: form,
  }, function(err, response) {
    if (err) return callback(err);

    if (response.statusCode == 404) {
      logger.error('HTTP 404; considering all users missing;', body);
      body = [];
    }
    else if (response.statusCode != 200) {
      return callback(new errors.HTTPError(response, body));
    }
    else {
      body = JSON.parse(response);
    }
    var find = function(user) {
      if (user.id_str) {
        return _.findWhere(body, user);
      }
      else {
        // search by screen_name must be case insensitive
        var needle = user.screen_name.toLowerCase();
        return _.find(body, function(full_user) {
          return full_user.screen_name.toLowerCase() == needle;
        });
      }
    };

    // extend the original objects
    users.forEach(function(user) {
      _.extend(user, find(user));
    });

    callback(null, users);
  });
};

exports.getUserStatuses = function(user_id, max_id, callback) {
  /**
  API: https://dev.twitter.com/docs/api/1.1/get/statuses/user_timeline
  */
  var query = {
    user_id: user_id,
    count: 200,
    trim_user: true,
    exclude_replies: false,
    contributor_details: true,
    include_rts: true,
  };

  if (max_id !== undefined) {
    query.max_id = max_id;
  }

  twilight.request({
    method: 'GET',
    url: 'https://api.twitter.com/1.1/statuses/user_timeline.json',
    timeout: 10000,
    json: true,
    qs: query,
  }, function(err, response, body) {
    if (err) return callback(err);

    if (response.statusCode != 200) {
      return callback(new errors.HTTPError(response, body));
    }
    callback(null, body);
  });
};

exports.getUserFollowers = function(user_id, callback) {
  // callback: function(Error | null, Array[String])
  twilight.getOAuth('~/.twitter', function(err, oauth) {
    if (err) return callback(err);

    request({
      method: 'GET',
      // https://dev.twitter.com/docs/api/1.1/get/followers/ids
      url: 'https://api.twitter.com/1.1/followers/ids.json',
      oauth: oauth,
      timeout: 10000,
      json: true,
      qs: {
        user_id: user_id,
        stringify_ids: 'true',
      },
    }, function(err, response, body) {
      if (err) return callback(err);

      if (response.statusCode != 200) {
        return callback(new errors.HTTPError(response, body));
      }
      callback(null, body.ids);
    });
  });
};

exports.getUserFriends = function(user_id, callback) {
  // callback: function(Error | null, Array[String])
  twilight.getOAuth('~/.twitter', function(err, oauth) {
    if (err) return callback(err);

    request({
      method: 'GET',
      // https://dev.twitter.com/docs/api/1.1/get/friends/ids
      url: 'https://api.twitter.com/1.1/friends/ids.json',
      oauth: oauth,
      timeout: 10000,
      json: true,
      qs: {
        user_id: user_id,
        stringify_ids: 'true',
      },
    }, function(err, response, body) {
      if (err) return callback(err);

      if (response.statusCode != 200) {
        return callback(new errors.HTTPError(response, body));
      }
      callback(null, body.ids);
    });
  });
};
