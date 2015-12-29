import { Readable } from 'stream';
import { IncomingMessage } from 'http';
import { PassThrough } from 'stream';
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
export declare type UserIdentifier = {
    id_str: string;
    screen_name?: string;
} | {
    id_str?: string;
    screen_name: string;
};
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

users is a list of {id_str: '18116587'} or {screen_name: 'chbrown'} objects.

Apparently Twitter is happy with both/either.

This API method can only handle 100 screen_names at a time
*/
export declare function getUsers(users: UserIdentifier[], callback: (error: Error, users?: User[]) => void): void;
/**
https://dev.twitter.com/rest/reference/get/statuses/user_timeline
*/
export declare function getUserStatuses(user: UserIdentifier, max_id: string, callback: (error: Error, statuses?: Status[]) => void): void;
/**
https://dev.twitter.com/rest/reference/get/followers/ids

@param {User} user - Whose followers we will find.
@returns {string[]} a list of user IDs for every user following the specified user.
*/
export declare function getUserFollowers(user: UserIdentifier, callback: (error: Error, followers?: string[]) => void): void;
/**
https://dev.twitter.com/rest/reference/get/friends/ids

@param {User} user - Whose followees we will find.
@returns {string[]} a list of user IDs for every user followed by specified user.
*/
export declare function getUserFriends(user: UserIdentifier, callback: (error: Error, friends?: string[]) => void): void;
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
