import {inspect} from 'util';
import {Transform, Readable} from 'stream';
import {IncomingMessage} from 'http';
import {defaults, find, assign, includes} from 'lodash';
import * as httpRequest from 'request';
import {logger, Level} from 'loge';
import {Stringifier} from 'sv';
import {parse as querystringParse} from 'querystring';
import {parse as urlParse, format as urlFormat} from 'url';
import {PassThrough} from 'stream';
import {createGunzip, createInflate} from 'zlib';

import {readToEnd} from 'streaming';
import {Splitter} from 'streaming/splitter';

import {TwitterAPIHTTPStatusCodes, TwitterAPIErrorCodes, TwitterAPIEndpoints} from './codes';
import {getOAuth} from './credentials';

// logger.level = Level.debug;
logger.level = Level.info;

export interface ObjectMap<T> {
  [index: string]: T;
}

export interface Status {
  contributors?: any;
  coordinates?: any;
  created_at?: string;
  favorited?: boolean;
  geo?: any;
  id?: number;
  id_str?: string;
  in_reply_to_screen_name?: string;
  in_reply_to_status_id?: number;
  in_reply_to_status_id_str?: string;
  in_reply_to_user_id?: number;
  in_reply_to_user_id_str?: string;
  place?: any;
  retweet_count?: number;
  retweeted?: boolean;
  retweeted_status?: Status;
  source?: string;
  text?: string;
  truncated?: boolean;
  user?: User;
  /** `missing` is a special non-API flag acting as a placeholder for
  non-existent or deleted statuses. */
  missing?: boolean;
}

export interface User {
  contributors_enabled?: boolean;
  created_at?: string;
  default_profile?: boolean;
  default_profile_image?: boolean;
  description?: string;
  favourites_count?: number;
  follow_request_sent?: boolean;
  followers_count?: number;
  following?: boolean;
  friends_count?: number;
  geo_enabled?: boolean;
  id?: number;
  id_str?: string;
  is_translator?: boolean;
  lang?: string;
  listed_count?: number;
  location?: string;
  name?: string;
  notifications?: boolean;
  profile_background_color?: string;
  profile_background_image_url?: string;
  profile_background_image_url_https?: string;
  profile_background_tile?: boolean;
  profile_banner_url?: string;
  profile_image_url?: string;
  profile_image_url_https?: string;
  profile_link_color?: string;
  profile_sidebar_border_color?: string;
  profile_sidebar_fill_color?: string;
  profile_text_color?: string;
  profile_use_background_image?: boolean;
  protected?: boolean;
  screen_name?: string;
  show_all_inline_media?: boolean;
  status?: Status;
  statuses_count?: number;
  time_zone?: string;
  url?: string;
  utc_offset?: number;
  verified?: boolean;
}

export interface UrlEntity {
  url: string;
  expanded_url: string;
}

export interface MediaEntity {
  url: string;
  media_url: string;
}

export interface TweetEntities {
  urls?: UrlEntity[];
  media?: MediaEntity[];
}

export interface GeoJSONShape {
  coordinates: [number, number][][],
  type: string;
}

export interface Place {
  attributes: ObjectMap<string>;
  bounding_box: GeoJSONShape;
  contained_within?: Place[];
  country: string;
  country_code: string;
  full_name: string;
  geometry?: GeoJSONShape;
  id: string;
  name: string;
  place_type: string;
  polylines?: string[];
  url: string;
}

function isDefined(value: any): boolean {
  return value !== undefined;
}

/**
@param {object} object - The object with some potentially 'undefined' values
@returns {object} - A shallow copy of object with no 'undefined' values.
*/
function compactObject<T>(object: T): T {
  // Object.keys(object).filter(key => object[key] === undefined).forEach(key => delete object[key]);
  let compactedObject: any = {};
  for (var key in object) {
    if (object[key] !== undefined) {
      compactedObject[key] = object[key];
    }
  }
  return compactedObject;
}

export function readJSON(readableStream: Readable, callback: (error: Error, body?: any) => void) {
  readToEnd(readableStream, (error, chunks) => {
    if (error) return callback(error);
    let parseError;
    let body = chunks.join('');
    try {
      body = JSON.parse(body);
    }
    catch (exc) {
      parseError = new Error(`Could not parse response as JSON: "${body}"; ${exc.toString}`);
    }
    callback(parseError, body);
  });
}

export class TwitterError extends Error {
  name = 'TwitterError';
  constructor(statusCode: number, errorMessages: string[]) {
    super();
    let {text, description} = find(TwitterAPIHTTPStatusCodes, ({code}) => code == statusCode);
    this.message = `${statusCode} ${text} (${description}): ${errorMessages.join(', ')}`;
  }
}

export const TwitterAPIFatalHTTPStatusCodes = [400, 401, 403, 406, 410, 420, 422, 429, 500, 502, 503, 504];

export interface RequestOptions {
  host?: string;
  endpoint: string;
  method?: string;
  headers?: {[index: string]: string};
  query?: any;
  form?: any;
  timeout?: number;
  retriesRemaining?: number;
}

export function request(options: RequestOptions,
                        callback: (error: Error, response?: IncomingMessage) => void) {
  defaults(options, {host: 'api.twitter.com', method: 'GET', retriesRemaining: 10, query: {}});
  // delete undefined query values
  options.query = compactObject(options.query);
  logger.debug(`request(${JSON.stringify(options)})`);
  // exit quickly if the endpoint is malformed
  let twitterAPIEndpoint = find(TwitterAPIEndpoints, ({regExp}) => regExp.test(options.endpoint));
  if (twitterAPIEndpoint === undefined) {
    return callback(new Error(`"${options.endpoint}" is not a valid Twitter API Endpoint`));
  }
  // intercept errors here in case we want to retry the request
  function handleError(error) {
    if (error && options.retriesRemaining > 0) {
      // options = {...options, retriesRemaining: options.retriesRemaining - 1}
      options.retriesRemaining--;
      if (error instanceof TwitterError) {
        logger.warning(`${error.toString()}... retrying`);
        return request(options, callback);
      }
      else if (error['code'] == 'ETIMEDOUT') {
        logger.warning(`ETIMEDOUT: ${error.toString()}... retrying`);
        return request(options, callback);
      }
      else if (error['code'] == 'ECONNRESET') {
        logger.warning(`ECONNRESET: ${error.toString()}... retrying`);
        return request(options, callback);
      }
    }
    callback(error);
  }
  getOAuth((error, oauth) => {
    if (error) return callback(error);

    let httpRequestOptions = {
      url: urlFormat({
        protocol: 'https:',
        slashes: true,
        host: options.host,
        pathname: `/1.1/${options.endpoint}.json`,
        query: options.query,
      }),
      headers: options.headers,
      form: options.form,
      method: options.method,
      timeout: 10000,
      oauth: oauth,
    };
    logger.debug(`httpRequest(${JSON.stringify(httpRequestOptions)})`);
    httpRequest(httpRequestOptions)
    .on('response', (response: IncomingMessage) => {
      // we don't want to treat all non-200 responses as errors; for example,
      // with /users/lookup, a 404 indicates that there were no matches at all.
      if (includes(TwitterAPIFatalHTTPStatusCodes, response.statusCode)) {
        // Twitter error responses look like:
        // {"errors":[{"message":"Sorry, that page does not exist","code":34}]}
        readJSON(response, (error, body: {errors: {message: string, code: number}[]}) => {
          if (error) return handleError(error);
          let errorMessages = body.errors.map(({message}) => message);
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

/**
Retrieve up to 100 "fully-hydrated" tweets in one request. It will return a list
of the same length as the input, replacing missing (e.g., deleted) tweets with
two fields: 'id_str' and 'missing'.

https://dev.twitter.com/rest/reference/get/statuses/lookup

@param {string[]} id_strs - array of tweet ID strings to fetch
@param {function} callback - callback when finished
*/
export function getStatuses(id_strs: string[],
                            callback: (error: Error, statuses?: Status[]) => void) {
  request({
    method: 'POST',
    endpoint: 'statuses/lookup',
    form: {
      // The lookup endpoint returns a list of {<tweet>} objects by default.
      // When map is "true", it returns a payload like: {id: { "123": {<tweet>}, "456": {<tweet>} } }
      map: true,
      id: id_strs.join(','),
    },
  }, (error, response) => {
    if (error) return callback(error);

    readToEnd(response, (error, chunks) => {
      if (error) return callback(error);

      let body = chunks.join('');
      let statusLookup: {[index: string]: Status} = JSON.parse(body).id;

      // statuses_map[id_str] will be null for all requested statuses that can't be found
      let statuses = id_strs.map((id_str) => statusLookup[id_str] || {id_str, missing: true});

      logger.debug(`Fetched ${statuses.length} statuses`);
      callback(null, statuses);
    });
  });
}

/**
Get the user objects for a list of user_ids and/or screen_names.

users is a list of {id_str: '18116587'} or {screen_name: 'chbrown'} objects,
i.e., {id_str: string} | {screen_name: string}

Apparently Twitter is happy with both/either.

This API method can only handle 100 screen_names at a time
*/
export function getUsers(users: {id_str?: string, screen_name?: string}[],
                         callback: (error: Error, users?: User[]) => void) {
  request({
    method: 'POST',
    endpoint: 'users/lookup',
    form: {
      user_id: users.map(user => user.id_str).filter(isDefined).join(','),
      screen_name: users.map(user => user.screen_name).filter(isDefined).join(','),
    },
  }, (error, response) => {
    if (error) return callback(error);

    readToEnd(response, (error, chunks) => {
      if (error) return callback(error);

      let body = chunks.join('')
      // HTTP 404 => consider all users missing
      let fullUsers: User[] = (response.statusCode === 404) ? [] : JSON.parse(body);

      // extend the original objects so that we end up with the same ordering
      let mergedUsers = users.map(user => { // {id_str: string} | {screen_name: string})
        if (user.id_str !== undefined) {
          return find(fullUsers, fullUser => fullUser.id_str == user.id_str);
        }
        else {
          // search by screen_name must be case insensitive
          let needle = user.screen_name.toLowerCase();
          return find(fullUsers, fullUser => fullUser.screen_name.toLowerCase() == needle);
        }
      });
      callback(null, mergedUsers);
    });
  });
}

/**
https://dev.twitter.com/rest/reference/get/statuses/user_timeline
*/
export function getUserStatuses(user: {id_str?: string, screen_name?: string},
                                max_id: string,
                                callback: (error: Error, statuses?: Status[]) => void) {
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
  }, (error, response) => {
    if (error) return callback(error);
    readJSON(response, callback);
  });
}

/**
https://dev.twitter.com/rest/reference/get/followers/ids

@param {User} user - Whose followers we will find.
@returns {string[]} a list of user IDs for every user following the specified user.
*/
export function getUserFollowers(user: {id_str?: string, screen_name?: string},
                                 callback: (error: Error, followers?: string[]) => void) {
  request({
    endpoint: 'followers/ids',
    query: {
      user_id: user.id_str,
      screen_name: user.screen_name,
      stringify_ids: 'true',
    },
  }, (error, response) => {
    if (error) return callback(error);
    readJSON(response, (error, body) => {
      if (error) return callback(error);
      callback(null, body.ids);
    });
  });
}

/**
https://dev.twitter.com/rest/reference/get/friends/ids

@param {User} user - Whose followees we will find.
@returns {string[]} a list of user IDs for every user followed by specified user.
*/
export function getUserFriends(user: {id_str?: string, screen_name?: string},
                               callback: (error: Error, friends?: string[]) => void) {
  request({
    endpoint: 'friends/ids',
    query: {
      user_id: user.id_str,
      screen_name: user.screen_name,
      stringify_ids: 'true',
    },
  }, (error, response) => {
    if (error) return callback(error);
    readJSON(response, (error, body) => {
      if (error) return callback(error);
      callback(null, body.ids);
    });
  });
}

/**
Returns all the information about a known place.
*/
export function getPlaceInformation(place_id: string,
                                    callback: (error: Error, place?: Place) => void) {
  request({endpoint: `geo/id/${place_id}`}, (error, response) => {
    if (error) return callback(error);
    readJSON(response, callback);
  });
}

export interface StatusStreamOptions {
  /** Form like "track=this" or "locations=those", etc. */
  filter?: string;
  /** Query like "language=en", etc. */
  sample?: string;
  /** User-Agent header value to send to Twitter */
  userAgent?: string;
  /** Ask for gzip compression from Twitter (default: false) */
  compress?: boolean;
}

/**
Creating a StatusStream immediately starts an infinite Twitter stream.
*/
export class StatusStream extends PassThrough {
  constructor(public options: StatusStreamOptions = {}) {
    super({objectMode: false});

    defaults(this.options, {decompress: false, interval: 86400});

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
      form: querystringParse(this.options.filter || this.options.sample || ''),
    }, (error, response) => {
      if (error) {
        this.emit('error', error);
        this.push(null);
        return;
      }
      // Decompress if needed. This must run from within the response
      // listener since we need the response headers.
      let outputStream: NodeJS.ReadableStream = response;
      let encoding = response.headers['content-encoding'];
      if (encoding == 'gzip') {
        logger.debug('gunzipping HTTP response');
        var gunzip = createGunzip();
        outputStream = outputStream.pipe(gunzip);
      }
      else if (encoding == 'deflate') {
        logger.debug('inflating HTTP response');
        var inflate = createInflate();
        outputStream = outputStream.pipe(gunzip);
      }

      outputStream.pipe(this);
    });
  }
}
