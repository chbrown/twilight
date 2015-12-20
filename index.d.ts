import { Readable } from 'stream';
import { IncomingMessage } from 'http';
import { PassThrough } from 'stream';
export interface ObjectMap<T> {
    [index: string]: T;
}
export interface Status {
    id_str: string;
    missing?: boolean;
    [index: string]: any;
}
export interface User {
    id_str: string;
    screen_name: string;
    [index: string]: any;
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
    coordinates: [number, number][][];
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
export declare function readJSON(readableStream: Readable, callback: (error: Error, body?: any) => void): void;
export declare class TwitterError extends Error {
    name: string;
    constructor(statusCode: number, errorMessages: string[]);
}
export declare const TwitterAPIFatalHTTPStatusCodes: number[];
export interface RequestOptions {
    host?: string;
    endpoint: string;
    method?: string;
    headers?: {
        [index: string]: string;
    };
    query?: any;
    form?: any;
    timeout?: number;
    retriesRemaining?: number;
}
export declare function request(options: RequestOptions, callback: (error: Error, response?: IncomingMessage) => void): void;
/**
Retrieve up to 100 "fully-hydrated" tweets in one request. It will return a list
of the same length as the input, replacing missing (e.g., deleted) tweets with
two fields: 'id_str' and 'missing'.

https://dev.twitter.com/rest/reference/get/statuses/lookup

@param {string[]} id_strs - array of tweet ID strings to fetch
@param {function} callback - callback when finished
*/
export declare function getStatuses(id_strs: string[], callback: (error: Error, statuses?: Status[]) => void): void;
/**
Get the user objects for a list of user_ids and/or screen_names.

users is a list of {id_str: '18116587'} or {screen_name: 'chbrown'} objects,
i.e., {id_str: string} | {screen_name: string}

Apparently Twitter is happy with both/either.

This API method can only handle 100 screen_names at a time
*/
export declare function getUsers(users: {
    id_str?: string;
    screen_name?: string;
}[], callback: (error: Error, users?: User[]) => void): void;
/**
https://dev.twitter.com/rest/reference/get/statuses/user_timeline
*/
export declare function getUserStatuses(user: {
    id_str?: string;
    screen_name?: string;
}, max_id: string, callback: (error: Error, statuses?: Status[]) => void): void;
/**
https://dev.twitter.com/rest/reference/get/followers/ids

@param {User} user - Whose followers we will find.
@returns {string[]} a list of user IDs for every user following the specified user.
*/
export declare function getUserFollowers(user: {
    id_str?: string;
    screen_name?: string;
}, callback: (error: Error, followers?: string[]) => void): void;
/**
https://dev.twitter.com/rest/reference/get/friends/ids

@param {User} user - Whose followees we will find.
@returns {string[]} a list of user IDs for every user followed by specified user.
*/
export declare function getUserFriends(user: {
    id_str?: string;
    screen_name?: string;
}, callback: (error: Error, friends?: string[]) => void): void;
/**
Returns all the information about a known place.
*/
export declare function getPlaceInformation(place_id: string, callback: (error: Error, place?: Place) => void): void;
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
export declare class StatusStream extends PassThrough {
    options: StatusStreamOptions;
    constructor(options?: StatusStreamOptions);
}
