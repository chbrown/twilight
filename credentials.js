var streaming_1 = require('streaming');
var sv_1 = require('sv');
var fs_1 = require('fs');
/**
Read accounts from tab/comma-separated values in `filepath`, which
should have the headers: consumer_key, consumer_secret, token, token_secret,
choose one at random, and use that.
*/
function getOAuthFromFile(filepath, callback) {
    var parser = fs_1.createReadStream(filepath, { encoding: 'utf8' }).pipe(new sv_1.Parser());
    streaming_1.readToEnd(parser, function (error, accounts) {
        if (error)
            return callback(error);
        var _a = accounts[Math.random() * accounts.length | 0], consumer_key = _a.consumer_key, consumer_secret = _a.consumer_secret, token = _a.token, token_secret = _a.token_secret;
        callback(null, { consumer_key: consumer_key, consumer_secret: consumer_secret, token: token, token_secret: token_secret });
    });
}
/**
Try to get read OAuth credentials from the environment (since in testing we
might want to specify all oauth credentials via the environment), and,
failing that, from ~/.twitter.
*/
function getOAuth(callback) {
    var _a = process.env, consumer_key = _a.consumer_key, consumer_secret = _a.consumer_secret, token = _a.token, token_secret = _a.token_secret;
    if (consumer_key && consumer_secret && token && token_secret) {
        callback(null, { consumer_key: consumer_key, consumer_secret: consumer_secret, token: token, token_secret: token_secret });
    }
    else {
        // otherwise (in the normal case) get oauth account info from file
        var defaultFilepath = process.env.HOME + "/.twitter";
        getOAuthFromFile(defaultFilepath, callback);
    }
}
exports.getOAuth = getOAuth;
