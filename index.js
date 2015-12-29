var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var lodash_1 = require('lodash');
var httpRequest = require('request');
var loge_1 = require('loge');
var querystring_1 = require('querystring');
var url_1 = require('url');
var stream_1 = require('stream');
var zlib_1 = require('zlib');
var streaming_1 = require('streaming');
var codes_1 = require('./codes');
var credentials_1 = require('./credentials');
// logger.level = Level.debug;
loge_1.logger.level = loge_1.Level.info;
function isDefined(value) {
    return value !== undefined;
}
/**
@param {object} object - The object with some potentially 'undefined' values
@returns {object} - A shallow copy of object with no 'undefined' values.
*/
function compactObject(object) {
    // Object.keys(object).filter(key => object[key] === undefined).forEach(key => delete object[key]);
    var compactedObject = {};
    for (var key in object) {
        if (object[key] !== undefined) {
            compactedObject[key] = object[key];
        }
    }
    return compactedObject;
}
function readJSON(readableStream, callback) {
    streaming_1.readToEnd(readableStream, function (error, chunks) {
        if (error)
            return callback(error);
        var parseError;
        var body = chunks.join('');
        try {
            body = JSON.parse(body);
        }
        catch (exc) {
            parseError = new Error("Could not parse response as JSON: \"" + body + "\"; " + exc.toString);
        }
        callback(parseError, body);
    });
}
exports.readJSON = readJSON;
var TwitterError = (function (_super) {
    __extends(TwitterError, _super);
    function TwitterError(statusCode, errorMessages) {
        _super.call(this);
        this.name = 'TwitterError';
        var _a = lodash_1.find(codes_1.TwitterAPIHTTPStatusCodes, function (_a) {
            var code = _a.code;
            return code == statusCode;
        }), text = _a.text, description = _a.description;
        this.message = statusCode + " " + text + " (" + description + "): " + errorMessages.join(', ');
    }
    return TwitterError;
})(Error);
exports.TwitterError = TwitterError;
exports.TwitterAPIFatalHTTPStatusCodes = [400, 401, 403, 406, 410, 420, 422, 429, 500, 502, 503, 504];
function request(options, callback) {
    lodash_1.defaults(options, { host: 'api.twitter.com', method: 'GET', retriesRemaining: 10, query: {} });
    // delete undefined query values
    options.query = compactObject(options.query);
    loge_1.logger.debug("request(" + JSON.stringify(options) + ")");
    // exit quickly if the endpoint is malformed
    var twitterAPIEndpoint = lodash_1.find(codes_1.TwitterAPIEndpoints, function (_a) {
        var regExp = _a.regExp;
        return regExp.test(options.endpoint);
    });
    if (twitterAPIEndpoint === undefined) {
        return callback(new Error("\"" + options.endpoint + "\" is not a valid Twitter API Endpoint"));
    }
    // intercept errors here in case we want to retry the request
    function handleError(error) {
        if (error && options.retriesRemaining > 0) {
            // options = {...options, retriesRemaining: options.retriesRemaining - 1}
            options.retriesRemaining--;
            if (error instanceof TwitterError) {
                loge_1.logger.warning(error.toString() + "... retrying");
                return request(options, callback);
            }
            else if (error['code'] == 'ETIMEDOUT') {
                loge_1.logger.warning("ETIMEDOUT: " + error.toString() + "... retrying");
                return request(options, callback);
            }
            else if (error['code'] == 'ECONNRESET') {
                loge_1.logger.warning("ECONNRESET: " + error.toString() + "... retrying");
                return request(options, callback);
            }
        }
        callback(error);
    }
    credentials_1.getOAuth(function (error, oauth) {
        if (error)
            return callback(error);
        var httpRequestOptions = {
            url: url_1.format({
                protocol: 'https:',
                slashes: true,
                host: options.host,
                pathname: "/1.1/" + options.endpoint + ".json",
                query: options.query,
            }),
            headers: options.headers,
            form: options.form,
            method: options.method,
            timeout: 10000,
            oauth: oauth,
        };
        loge_1.logger.debug("httpRequest(" + JSON.stringify(httpRequestOptions) + ")");
        httpRequest(httpRequestOptions)
            .on('response', function (response) {
            // we don't want to treat all non-200 responses as errors; for example,
            // with /users/lookup, a 404 indicates that there were no matches at all.
            if (lodash_1.includes(exports.TwitterAPIFatalHTTPStatusCodes, response.statusCode)) {
                // Twitter error responses look like:
                // {"errors":[{"message":"Sorry, that page does not exist","code":34}]}
                readJSON(response, function (error, body) {
                    if (error)
                        return handleError(error);
                    var errorMessages = body.errors.map(function (_a) {
                        var message = _a.message;
                        return message;
                    });
                    handleError(new TwitterError(response.statusCode, errorMessages));
                });
            }
            else {
                callback(null, response);
            }
        })
            .on('error', handleError);
    });
}
exports.request = request;
/**
Retrieve up to 100 "fully-hydrated" tweets in one request. It will return a list
of the same length as the input, replacing missing (e.g., deleted) tweets with
two fields: 'id_str' and 'missing'.

https://dev.twitter.com/rest/reference/get/statuses/lookup

@param {string[]} id_strs - array of tweet ID strings to fetch
@param {function} callback - callback when finished
*/
function getStatuses(id_strs, callback) {
    request({
        method: 'POST',
        endpoint: 'statuses/lookup',
        form: {
            // The lookup endpoint returns a list of {<tweet>} objects by default.
            // When map is "true", it returns a payload like: {id: { "123": {<tweet>}, "456": {<tweet>} } }
            map: true,
            id: id_strs.join(','),
        },
    }, function (error, response) {
        if (error)
            return callback(error);
        streaming_1.readToEnd(response, function (error, chunks) {
            if (error)
                return callback(error);
            var body = chunks.join('');
            var statusLookup = JSON.parse(body).id;
            // statuses_map[id_str] will be null for all requested statuses that can't be found
            var statuses = id_strs.map(function (id_str) { return statusLookup[id_str] || { id_str: id_str, missing: true }; });
            loge_1.logger.debug("Fetched " + statuses.length + " statuses");
            callback(null, statuses);
        });
    });
}
exports.getStatuses = getStatuses;
/**
Get the user objects for a list of user_ids and/or screen_names.

users is a list of {id_str: '18116587'} or {screen_name: 'chbrown'} objects.

Apparently Twitter is happy with both/either.

This API method can only handle 100 screen_names at a time
*/
function getUsers(users, callback) {
    request({
        method: 'POST',
        endpoint: 'users/lookup',
        form: {
            user_id: users.map(function (user) { return user.id_str; }).filter(isDefined).join(','),
            screen_name: users.map(function (user) { return user.screen_name; }).filter(isDefined).join(','),
        },
    }, function (error, response) {
        if (error)
            return callback(error);
        streaming_1.readToEnd(response, function (error, chunks) {
            if (error)
                return callback(error);
            var body = chunks.join('');
            // HTTP 404 => consider all users missing
            var fullUsers = (response.statusCode === 404) ? [] : JSON.parse(body);
            // extend the original objects so that we end up with the same ordering
            var mergedUsers = users.map(function (user) {
                if (user.id_str !== undefined) {
                    return lodash_1.find(fullUsers, function (fullUser) { return fullUser.id_str == user.id_str; });
                }
                else {
                    // search by screen_name must be case insensitive
                    var needle = user.screen_name.toLowerCase();
                    return lodash_1.find(fullUsers, function (fullUser) { return fullUser.screen_name.toLowerCase() == needle; });
                }
            });
            callback(null, mergedUsers);
        });
    });
}
exports.getUsers = getUsers;
/**
https://dev.twitter.com/rest/reference/get/statuses/user_timeline
*/
function getUserStatuses(user, max_id, callback) {
    request({
        endpoint: 'statuses/user_timeline',
        query: {
            user_id: user.id_str,
            screen_name: user.screen_name,
            count: 200,
            trim_user: true,
            exclude_replies: false,
            contributor_details: true,
            include_rts: true,
            max_id: max_id,
        },
    }, function (error, response) {
        if (error)
            return callback(error);
        readJSON(response, callback);
    });
}
exports.getUserStatuses = getUserStatuses;
/**
https://dev.twitter.com/rest/reference/get/followers/ids

@param {User} user - Whose followers we will find.
@returns {string[]} a list of user IDs for every user following the specified user.
*/
function getUserFollowers(user, callback) {
    request({
        endpoint: 'followers/ids',
        query: {
            user_id: user.id_str,
            screen_name: user.screen_name,
            stringify_ids: 'true',
        },
    }, function (error, response) {
        if (error)
            return callback(error);
        readJSON(response, function (error, body) {
            if (error)
                return callback(error);
            callback(null, body.ids);
        });
    });
}
exports.getUserFollowers = getUserFollowers;
/**
https://dev.twitter.com/rest/reference/get/friends/ids

@param {User} user - Whose followees we will find.
@returns {string[]} a list of user IDs for every user followed by specified user.
*/
function getUserFriends(user, callback) {
    request({
        endpoint: 'friends/ids',
        query: {
            user_id: user.id_str,
            screen_name: user.screen_name,
            stringify_ids: 'true',
        },
    }, function (error, response) {
        if (error)
            return callback(error);
        readJSON(response, function (error, body) {
            if (error)
                return callback(error);
            callback(null, body.ids);
        });
    });
}
exports.getUserFriends = getUserFriends;
/**
Returns all the information about a known place.
*/
function getPlaceInformation(place_id, callback) {
    request({ endpoint: "geo/id/" + place_id }, function (error, response) {
        if (error)
            return callback(error);
        readJSON(response, callback);
    });
}
exports.getPlaceInformation = getPlaceInformation;
/**
Creating a StatusStream immediately starts an infinite Twitter stream.
*/
var StatusStream = (function (_super) {
    __extends(StatusStream, _super);
    function StatusStream(options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        _super.call(this, { objectMode: false });
        this.options = options;
        lodash_1.defaults(this.options, { decompress: false, interval: 86400 });
        request({
            host: 'stream.twitter.com',
            method: 'POST',
            endpoint: this.options.filter ? 'statuses/filter' : 'statuses/sample',
            headers: {
                // The User-Agent header is required, if we want Twitter to respect our
                // accept-encoding value.
                'User-Agent': this.options.userAgent,
                // the 'request' library deletes headers with undefined values
                'Accept-Encoding': this.options.compress ? 'deflate, gzip' : undefined,
            },
            form: querystring_1.parse(this.options.filter || this.options.sample || ''),
        }, function (error, response) {
            if (error) {
                _this.emit('error', error);
                _this.push(null);
                return;
            }
            // Decompress if needed. This must run from within the response
            // listener since we need the response headers.
            var outputStream = response;
            var encoding = response.headers['content-encoding'];
            if (encoding == 'gzip') {
                loge_1.logger.debug('gunzipping HTTP response');
                var gunzip = zlib_1.createGunzip();
                outputStream = outputStream.pipe(gunzip);
            }
            else if (encoding == 'deflate') {
                loge_1.logger.debug('inflating HTTP response');
                var inflate = zlib_1.createInflate();
                outputStream = outputStream.pipe(gunzip);
            }
            outputStream.pipe(_this);
        });
    }
    return StatusStream;
})(stream_1.PassThrough);
exports.StatusStream = StatusStream;
