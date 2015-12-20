exports.TwitterAPIHTTPStatusCodes = [
    {
        code: 200,
        text: "OK",
        description: "Success!"
    },
    {
        code: 304,
        text: "Not Modified",
        description: "There was no new data to return."
    },
    {
        code: 400,
        text: "Bad Request",
        description: "The request was invalid or cannot be otherwise served. An accompanying error message will explain further. In API v1.1, requests without authentication are considered invalid and will yield this response."
    },
    {
        code: 401,
        text: "Unauthorized",
        description: "Authentication credentials were missing or incorrect.Also returned in other circumstances, for example all calls to API v1 endpoints now return 401 (use API v1.1 instead)."
    },
    {
        code: 403,
        text: "Forbidden",
        description: "The request is understood, but it has been refused or access is not allowed. An accompanying error message will explain why. This code is used when requests are being denied due to update limits. Other reasons for this status being returned are listed alongside the response codes in the table below."
    },
    {
        code: 404,
        text: "Not Found",
        description: "The URI requested is invalid or the resource requested, such as a user, does not exists. Also returned when the requested format is not supported by the requested method."
    },
    {
        code: 406,
        text: "Not Acceptable",
        description: "Returned by the Search API when an invalid format is specified in the request."
    },
    {
        code: 410,
        text: "Gone",
        description: "This resource is gone. Used to indicate that an API endpoint has been turned off. For example: “The Twitter REST API v1 will soon stop functioning. Please migrate to API v1.1.”"
    },
    {
        code: 420,
        text: "Enhance Your Calm",
        description: "Returned by the version 1 Search and Trends APIs when you are being rate limited."
    },
    {
        code: 422,
        text: "Unprocessable Entity",
        description: "Returned when an image uploaded to POST account / update_profile_banner is unable to be processed."
    },
    {
        code: 429,
        text: "Too Many Requests",
        description: "Returned in API v1.1 when a request cannot be served due to the application’s rate limit having been exhausted for the resource. See Rate Limiting in API v1.1."
    },
    {
        code: 500,
        text: "Internal Server Error",
        description: "Something is broken. Please post to the developer forums so the Twitter team can investigate."
    },
    {
        code: 502,
        text: "Bad Gateway",
        description: "Twitter is down or being upgraded."
    },
    {
        code: 503,
        text: "Service Unavailable",
        description: "The Twitter servers are up, but overloaded with requests. Try again later."
    },
    {
        code: 504,
        text: "Gateway timeout",
        description: "The Twitter servers are up, but the request couldn’t be serviced due to some failure within our stack. Try again later."
    }
];
exports.TwitterAPIErrorCodes = [
    {
        code: 32,
        text: "Could not authenticate you",
        description: "Your call could not be completed as dialed."
    },
    {
        code: 34,
        text: "Sorry, that page does not exist",
        description: "Corresponds with an HTTP 404 - the specified resource was not found."
    },
    {
        code: 64,
        text: "Your account is suspended and is not permitted to access this feature",
        description: "Corresponds with an HTTP 403 — the access token being used belongs to a suspended user and they can’t complete the action you’re trying to take"
    },
    {
        code: 68,
        text: "The Twitter REST API v1 is no longer active. Please migrate to API v1.1. https://dev.twitter.com/rest/public",
        description: "Corresponds to a HTTP request to a retired v1-era URL."
    },
    {
        code: 88,
        text: "Rate limit exceeded",
        description: "The request limit for this resource has been reached for the current rate limit window."
    },
    {
        code: 89,
        text: "Invalid or expired token",
        description: "The access token used in the request is incorrect or has expired. Used in API v1.1"
    },
    {
        code: 92,
        text: "SSL is required",
        description: "Only SSL connections are allowed in the API, you should update your request to a secure connection. See how to connect using SSL"
    },
    {
        code: 130,
        text: "Over capacity",
        description: "Corresponds with an HTTP 503 - Twitter is temporarily over capacity."
    },
    {
        code: 131,
        text: "Internal error",
        description: "Corresponds with an HTTP 500 - An unknown internal error occurred."
    },
    {
        code: 135,
        text: "Could not authenticate you",
        description: "Corresponds with a HTTP 401 - it means that your oauth_timestamp is either ahead or behind our acceptable range"
    },
    {
        code: 161,
        text: "You are unable to follow more people at this time",
        description: "Corresponds with HTTP 403 — thrown when a user cannot follow another user due to some kind of limit"
    },
    {
        code: 179,
        text: "Sorry, you are not authorized to see this status",
        description: "Corresponds with HTTP 403 — thrown when a Tweet cannot be viewed by the authenticating user, usually due to the tweet’s author having protected their tweets."
    },
    {
        code: 185,
        text: "User is over daily status update limit",
        description: "Corresponds with HTTP 403 — thrown when a tweet cannot be posted due to the user having no allowance remaining to post. Despite the text in the error message indicating that this error is only thrown when a daily limit is reached, this error will be thrown whenever a posting limitation has been reached. Posting allowances have roaming windows of time of unspecified duration."
    },
    {
        code: 187,
        text: "Status is a duplicate",
        description: "The status text has been Tweeted already by the authenticated account."
    },
    {
        code: 215,
        text: "Bad authentication data",
        description: "Typically sent with 1.1 responses with HTTP code 400. The method requires authentication but it was not presented or was wholly invalid."
    },
    {
        code: 226,
        text: "This request looks like it might be automated. To protect our users from spam and other malicious activity, we can’t complete this action right now.",
        description: "We constantly monitor and adjust our filters to block spam and malicious activity on the Twitter platform. These systems are tuned in real-time. If you get this response our systems have flagged the Tweet or DM as possibly fitting this profile. If you feel that the Tweet or DM you attempted to create was flagged in error, please report the details around that to us by filing a ticket at https://support.twitter.com/forms/platform."
    },
    {
        code: 231,
        text: "User must verify login",
        description: "Returned as a challenge in xAuth when the user has login verification enabled on their account and needs to be directed to twitter.com to generate a temporary password."
    },
    {
        code: 251,
        text: "This endpoint has been retired and should not be used.",
        description: "Corresponds to a HTTP request to a retired URL."
    },
    {
        code: 261,
        text: "Application cannot perform write actions.",
        description: "Corresponds with HTTP 403 — thrown when the application is restricted from POST, PUT, or DELETE actions. See How to appeal application suspension and other disciplinary actions."
    },
    {
        code: 271,
        text: "You can’t mute yourself.",
        description: "Corresponds with HTTP 403. The authenticated user account cannot mute itself."
    },
    {
        code: 272,
        text: "You are not muting the specified user.",
        description: "Corresponds with HTTP 403. The authenticated user account is not muting the account a call is attempting to unmute."
    },
    {
        code: 354,
        text: "The text of your direct message is over the max character limit.",
        description: "Corresponds with HTTP 403. The message size exceeds the number of characters permitted in a direct message."
    }
];
exports.TwitterAPIEndpoints = [
    {
        path: 'statuses/mentions_timeline',
        method: 'GET',
    },
    {
        path: 'statuses/user_timeline',
        method: 'GET',
    },
    {
        path: 'statuses/home_timeline',
        method: 'GET',
    },
    {
        path: 'statuses/retweets_of_me',
        method: 'GET',
    },
    {
        path: 'statuses/retweets/:id',
        method: 'GET',
    },
    {
        path: 'statuses/show/:id',
        method: 'GET',
    },
    {
        path: 'statuses/destroy/:id',
        method: 'POST',
    },
    {
        path: 'statuses/update',
        method: 'POST',
    },
    {
        path: 'statuses/retweet/:id',
        method: 'POST',
    },
    {
        path: 'statuses/update_with_media',
        method: 'POST',
    },
    {
        path: 'statuses/oembed',
        method: 'GET',
    },
    {
        path: 'statuses/retweeters/ids',
        method: 'GET',
    },
    {
        path: 'statuses/lookup',
        method: 'GET',
    },
    {
        path: 'media/upload',
        method: 'POST',
    },
    {
        path: 'media/upload chunked',
        method: 'POST',
    },
    {
        path: 'direct_messages/sent',
        method: 'GET',
    },
    {
        path: 'direct_messages/show',
        method: 'GET',
    },
    {
        path: 'search/tweets',
        method: 'GET',
    },
    {
        path: 'direct_messages',
        method: 'GET',
    },
    {
        path: 'direct_messages/destroy',
        method: 'POST',
    },
    {
        path: 'direct_messages/new',
        method: 'POST',
    },
    {
        path: 'friendships/no_retweets/ids',
        method: 'GET',
    },
    {
        path: 'friends/ids',
        method: 'GET',
    },
    {
        path: 'followers/ids',
        method: 'GET',
    },
    {
        path: 'friendships/incoming',
        method: 'GET',
    },
    {
        path: 'friendships/outgoing',
        method: 'GET',
    },
    {
        path: 'friendships/create',
        method: 'POST',
    },
    {
        path: 'friendships/destroy',
        method: 'POST',
    },
    {
        path: 'friendships/update',
        method: 'POST',
    },
    {
        path: 'friendships/show',
        method: 'GET',
    },
    {
        path: 'friends/list',
        method: 'GET',
    },
    {
        path: 'followers/list',
        method: 'GET',
    },
    {
        path: 'friendships/lookup',
        method: 'GET',
    },
    {
        path: 'account/settings',
        method: 'GET',
    },
    {
        path: 'account/verify_credentials',
        method: 'GET',
    },
    {
        path: 'account/settings',
        method: 'POST',
    },
    {
        path: 'account/update_delivery_device',
        method: 'POST',
    },
    {
        path: 'account/update_profile',
        method: 'POST',
    },
    {
        path: 'account/update_profile_background_image',
        method: 'POST',
    },
    {
        path: 'account/update_profile_image',
        method: 'POST',
    },
    {
        path: 'blocks/list',
        method: 'GET',
    },
    {
        path: 'blocks/ids',
        method: 'GET',
    },
    {
        path: 'blocks/create',
        method: 'POST',
    },
    {
        path: 'blocks/destroy',
        method: 'POST',
    },
    {
        path: 'users/lookup',
        method: 'GET',
    },
    {
        path: 'users/show',
        method: 'GET',
    },
    {
        path: 'users/search',
        method: 'GET',
    },
    {
        path: 'account/remove_profile_banner',
        method: 'POST',
    },
    {
        path: 'account/update_profile_banner',
        method: 'POST',
    },
    {
        path: 'users/profile_banner',
        method: 'GET',
    },
    {
        path: 'mutes/users/create',
        method: 'POST',
    },
    {
        path: 'mutes/users/destroy',
        method: 'POST',
    },
    {
        path: 'mutes/users/ids',
        method: 'GET',
    },
    {
        path: 'mutes/users/list',
        method: 'GET',
    },
    {
        path: 'users/suggestions/:slug',
        method: 'GET',
    },
    {
        path: 'users/suggestions',
        method: 'GET',
    },
    {
        path: 'users/suggestions/:slug/members',
        method: 'GET',
    },
    {
        path: 'favorites/list',
        method: 'GET',
    },
    {
        path: 'favorites/destroy',
        method: 'POST',
    },
    {
        path: 'favorites/create',
        method: 'POST',
    },
    {
        path: 'lists/list',
        method: 'GET',
    },
    {
        path: 'lists/statuses',
        method: 'GET',
    },
    {
        path: 'lists/members/destroy',
        method: 'POST',
    },
    {
        path: 'lists/memberships',
        method: 'GET',
    },
    {
        path: 'lists/subscribers',
        method: 'GET',
    },
    {
        path: 'lists/subscribers/create',
        method: 'POST',
    },
    {
        path: 'lists/subscribers/show',
        method: 'GET',
    },
    {
        path: 'lists/subscribers/destroy',
        method: 'POST',
    },
    {
        path: 'lists/members/create_all',
        method: 'POST',
    },
    {
        path: 'lists/members/show',
        method: 'GET',
    },
    {
        path: 'lists/members',
        method: 'GET',
    },
    {
        path: 'lists/members/create',
        method: 'POST',
    },
    {
        path: 'lists/destroy',
        method: 'POST',
    },
    {
        path: 'lists/update',
        method: 'POST',
    },
    {
        path: 'lists/create',
        method: 'POST',
    },
    {
        path: 'lists/show',
        method: 'GET',
    },
    {
        path: 'lists/subscriptions',
        method: 'GET',
    },
    {
        path: 'lists/members/destroy_all',
        method: 'POST',
    },
    {
        path: 'lists/ownerships',
        method: 'GET',
    },
    {
        path: 'saved_searches/list',
        method: 'GET',
    },
    {
        path: 'saved_searches/show/:id',
        method: 'GET',
    },
    {
        path: 'saved_searches/create',
        method: 'POST',
    },
    {
        path: 'saved_searches/destroy/:id',
        method: 'POST',
    },
    {
        path: 'geo/id/:place_id',
        method: 'GET',
    },
    {
        path: 'geo/reverse_geocode',
        method: 'GET',
    },
    {
        path: 'geo/search',
        method: 'GET',
    },
    {
        path: 'geo/place',
        method: 'POST',
    },
    {
        path: 'trends/place',
        method: 'GET',
    },
    {
        path: 'trends/available',
        method: 'GET',
    },
    {
        path: 'application/rate_limit_status',
        method: 'GET',
    },
    {
        path: 'help/configuration',
        method: 'GET',
    },
    {
        path: 'help/languages',
        method: 'GET',
    },
    {
        path: 'help/privacy',
        method: 'GET',
    },
    {
        path: 'help/tos',
        method: 'GET',
    },
    {
        path: 'trends/closest',
        method: 'GET',
    },
    {
        path: 'users/report_spam',
        method: 'POST',
    },
    // streaming
    {
        path: 'statuses/sample',
        method: 'GET',
    },
    {
        path: 'statuses/filter',
        method: 'POST',
    },
].map(function (_a) {
    var path = _a.path, method = _a.method;
    var regExp = new RegExp('^' + path.replace(/:\w+/g, '\\w+').replace(/\//g, '\/') + '$');
    return { path: path, method: method, regExp: regExp };
});
