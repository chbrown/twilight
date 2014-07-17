'use strict'; /*jslint node: true, es5: true, indent: 2 */
var sv = require('sv');
var util = require('util');
var Splitter = require('streaming').Splitter;

function clean(s) {
  return (s === undefined || s === null) ? s : s.replace(/[\t\n\r]/g, ' ');
}
function compactDate(dt) {
  if (!dt) {
    return '';
  }
  if (!util.isDate(dt)) {
    // support both strings and Date objects
    dt = new Date(dt);
  }
  // '%Y%m%dT%H%M%S' -> YYYYMMDDTHHMMSS
  return dt.toISOString().replace(/\..+/, '').replace(/[-:]/g, '');
}

var JSONStoTweet = exports.JSONStoTweet = function() {
  // converts json strings to objects
  Splitter.call(this, '\n', {objectMode: true});
};
util.inherits(JSONStoTweet, Splitter);
JSONStoTweet.prototype._chunk = function(chunk, encoding) {
  var obj;
  if (encoding == 'buffer' || encoding === undefined) encoding = 'utf8';
  var line = Buffer.isBuffer(chunk) ? chunk.toString(encoding) : chunk;

  line = line.trim();
  if (line.length === 0) {
    // simply ignore empty lines
    return;
  }

  try {
    obj = JSON.parse(line);
  } catch (err) {
    err.message += ' while trying to JSON.parse("' + line + '")';
    this.emit('error', err);
    return;
  }

  if (!obj.text) {
    // ignoring "delete" or "{ limit: { track: 587 } }" notice
    return;
  }
  var text = clean(obj.text);
  var entities = obj.entities || {};
  (entities.urls || []).forEach(function(url) {
    text = text.replace(url.url, url.expanded_url || url.url);
  });
  (entities.media || []).forEach(function(url) {
    text = text.replace(url.url, url.media_url || url.url);
  });
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<');

  var coords;
  if (obj.coordinates) {
    var x = obj.coordinates.coordinates[0];
    var y = obj.coordinates.coordinates[1];
    coords = x.toFixed(8) + ',' + y.toFixed(8);
  }

  var place_str = '';
  if (obj.place) {
    place_str = obj.place.full_name;
    if (obj.place.full_name != obj.place.country) {
      place_str += '; ' + obj.place.country;
    }
  }

  var user = obj.user || {};
  this.push({
    id: obj.id_str,
    created_at: compactDate(obj.created_at),
    text: text,
    coordinates: coords,
    place_id: (obj.place || {}).id,
    place_str: place_str,
    in_reply_to_status_id: obj.in_reply_to_status_id_str,
    in_reply_to_screen_name: obj.in_reply_to_screen_name,
    retweet_id: (obj.retweeted_status || {}).id_str,
    retweet_count: obj.retweet_count,
    user_screen_name: user.screen_name,
    user_id: user.id_str,
    user_created_at: compactDate(user.created_at),
    user_name: clean(user.name),
    user_description: clean(user.description),
    user_location: clean(user.location),
    user_url: clean(user.url),
    user_statuses_count: user.statuses_count || '0',
    user_followers_count: user.followers_count || '0',
    user_friends_count: user.friends_count || '0',
    user_favourites_count: user.favourites_count || '0',
    user_geo_enabled: user.geo_enabled ? 'T' : 'F',
    user_default_profile: user.default_profile ? 'T' : 'F',
    user_time_zone: user.time_zone,
    user_lang: user.lang,
    user_utc_offset: user.utc_offset,
  });
};

var TweetToTTV2 = exports.TweetToTTV2 = function() {
  // converts tweet objects to tab separated format (specifically, TTV2)
  sv.Stringifier.call(this, {
    columns: [
      'id', 'created_at', 'text', 'coordinates', 'place_id', 'place_str',
      'in_reply_to_status_id', 'in_reply_to_screen_name', 'retweet_id',
      'retweet_count', 'user_screen_name', 'user_id', 'user_created_at',
      'user_name', 'user_description', 'user_location', 'user_url',
      'user_statuses_count', 'user_followers_count', 'user_friends_count',
      'user_favourites_count', 'user_geo_enabled', 'user_default_profile',
      'user_time_zone', 'user_lang', 'user_utc_offset'],
    encoding: 'utf8',
    missing: '',
    delimiter: '\t',
  });
};
util.inherits(TweetToTTV2, sv.Stringifier);
