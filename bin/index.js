var fs_1 = require('fs');
var url_1 = require('url');
var yargs = require('yargs');
var loge_1 = require('loge');
var batcher_1 = require('streaming/batcher');
var filter_1 = require('streaming/filter');
var json_1 = require('streaming/json');
var splitter_1 = require('streaming/splitter');
var timeout_1 = require('streaming/timeout');
var transformer_1 = require('streaming/transformer');
var index_1 = require('../index');
var codes_1 = require('../codes');
function readExistingTweets(outputFilepath, callback) {
    var fetchedStatuses = {};
    // quick exit if output is undefined
    if (outputFilepath === undefined)
        return callback(null, fetchedStatuses);
    loge_1.logger.info("Reading existing tweets from \"" + outputFilepath + "\"");
    var inputStream = fs_1.createReadStream(outputFilepath, { flags: 'r', encoding: 'utf8' });
    inputStream.pipe(new json_1.Parser())
        .on('data', function (status) {
        fetchedStatuses[status.id_str] = 1;
    })
        .on('error', function (error) {
        callback(error);
    })
        .on('end', function () {
        loge_1.logger.info("Found " + Object.keys(fetchedStatuses).length + " tweets in \"" + outputFilepath + "\"");
        callback(null, fetchedStatuses);
    });
}
/**
STDIN should be a newline-separated list of status IDs

TODO: call the callback on error
*/
function statuses(argvparser, callback) {
    var argv = argvparser.options({
        output: {
            description: 'tweet destination file (defaults to STDOUT)',
            alias: 'o',
        },
    }).argv;
    /**
    @param {string[]} id_strs - A batch of status id strings
    @param {string} encoding - should be null
    */
    function transformFn(id_strs, encoding, callback) {
        var _this = this;
        index_1.getStatuses(id_strs, function (error, statuses) {
            if (error)
                return callback(error);
            // in this context, `this` will be a streaming.Transformer (which extends stream.Transform)
            statuses.forEach(function (status) { return _this.push(status); });
            return callback();
        });
    }
    var outputStream = argv.output ? fs_1.createWriteStream(argv.output, { flags: 'a', encoding: 'utf8' }) : process.stdout;
    readExistingTweets(argv.output, function (error, fetchedStatuses) {
        if (error)
            return callback(error);
        // process.stdin.resume();
        // inputStream.setEncoding('utf8');
        process.stdin
            .pipe(new splitter_1.Splitter())
            .pipe(new filter_1.Filter(function (statusID) { return fetchedStatuses[statusID] === undefined; }))
            .pipe(new batcher_1.Batcher(100))
            .pipe(new transformer_1.Transformer(transformFn, { objectMode: true }))
            .pipe(new json_1.Stringifier())
            .pipe(outputStream)
            .on('end', callback);
    });
}
/**
Make a custom request to the Twitter API
*/
function rest(argvparser, callback) {
    var argv = argvparser.options({
        method: {
            description: 'GET / POST',
        },
        // data: {
        //   description: 'querystring-encoded data to send',
        // },
        timeout: {
            description: 'timeout period (milliseconds)',
            type: 'number',
        },
        pretty: {
            description: 'prettify json output',
            type: 'boolean',
        },
    }).demand(2).argv;
    var _a = url_1.parse(argv._[1], true), host = _a.host, pathname = _a.pathname, query = _a.query;
    index_1.request({
        host: host || undefined,
        endpoint: pathname.replace(/^(\/?1\.[01])?\/?/, '').replace(/\.json$/, ''),
        method: argv.method,
        // headers: argv.headers,
        query: (argv.method !== 'POST') ? query : undefined,
        form: (argv.method === 'POST') ? query : undefined,
        timeout: argv.timeout,
    }, function (error, response) {
        if (error)
            return callback(error);
        index_1.readJSON(response, function (error, body) {
            if (error)
                return callback(error);
            console.log(JSON.stringify(body, null, argv.pretty ? '  ' : null));
            callback();
        });
    });
}
function stream(argvparser, callback) {
    var argv = argvparser
        .describe({
        filter: 'parameters for filter endpoint',
        sample: 'parameters for sample endpoint',
        file: 'output target (- for STDOUT)',
        interval: 'die after a silence of this many seconds (defaults to 10 minutes)',
        timeout: 'die this many seconds after starting, no matter what (default: never)',
        useragent: 'User-Agent header to send in HTTP request',
        compress: 'request gzip / deflate compression from twitter',
        ttv2: 'convert to TTV2 (defaults to false, meaning JSON)',
    })
        .boolean(['ttv2'])
        .default({
        interval: 10 * 60,
        compress: false,
        file: '-',
        useragent: 'twilight/stream',
    })
        .check(function (argv) {
        if (argv.query) {
            throw new Error('--query is not a valid argument');
        }
        if (argv.filter && argv.sample) {
            throw new Error('You cannot specify both --filter and --sample.');
        }
        return true;
    }).argv;
    // statusStreamOptions
    var filter = argv.filter, sample = argv.sample, userAgent = argv.useragent, compress = argv.compress, interval = argv.interval, timeout = argv.timeout;
    var inputStream = new index_1.StatusStream({ filter: filter, sample: sample, userAgent: userAgent, compress: compress });
    // inputStream.on('error', function(err) {
    //   console.error('cli error');
    // process.exit(1);
    // })
    // inputStream.on('end', function() {
    //   console.error('cli end');
    // statusStream.end();
    // statusStream.request.abort();
    // console.error('  req', statusStream.request);
    // statusStream.response.socket.end();
    // statusStream.response.socket.destroy();
    // statusStream.response.socket.unref();
    // console.error('  res', statusStream.response);
    // });
    // ensure we get something every `interval` seconds.
    inputStream = inputStream.pipe(new timeout_1.Timeout(interval));
    // default: destination is STDOUT
    var outputStream = process.stdout;
    if (argv.file !== '-') {
        // destination is a file
        var filepath = argv.file.replace(/TIMESTAMP/, function () {
            return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        });
        outputStream = fs_1.createWriteStream(filepath, { flags: 'a', mode: 436 }); // 0664 === 436
    }
    inputStream.pipe(outputStream);
    inputStream.on('error', callback);
    // hard reset timeout (optional)
    if (timeout !== undefined) {
        setTimeout(function () {
            inputStream.emit('error', new Error("Elapsed lifetime of " + timeout + "s."));
            inputStream.end();
        }, timeout * 1000);
    }
}
/**
STDIN should be a line-delimited stream of JSON objects like
{screen_name: 'chbrown'} or {id_str: '14380188'}
*/
function users(argvparser, callback) {
    var argv = argvparser.argv;
    function transformFn(userIdentifiers, encoding, callback) {
        var _this = this;
        index_1.getUsers(userIdentifiers, function (error, users) {
            if (error)
                return callback(error);
            users.forEach(function (user) { return _this.push(user); });
            return callback();
        });
    }
    // process.stdin.setEncoding('utf8');
    process.stdin.resume();
    var stream = process.stdin
        .pipe(new json_1.Parser())
        .pipe(new batcher_1.Batcher(100))
        .pipe(new transformer_1.Transformer(transformFn, { objectMode: true }))
        .pipe(new json_1.Stringifier())
        .pipe(process.stdout);
    stream.on('end', callback);
}
function showRestHelp() {
    codes_1.TwitterAPIEndpoints.forEach(function (_a) {
        var path = _a.path, method = _a.method;
        console.log(method + " " + path);
    });
}
var commands = { stream: stream, rest: rest, users: users, statuses: statuses };
function main() {
    var argvparser = yargs
        .usage('Usage: twilight <command> [<args>]')
        .command('stream', 'Call one of the Twitter Streaming API endpoints')
        .example('twilight stream --filter "track=bieber"', 'Start filter stream')
        .command('rest', 'Call one of the Twitter REST API endpoints')
        .example('twilight rest /geo/id/1d9a5370a355ab0c.json', 'Get information for the Chigao "place"')
        .command('users', 'Get user info from stream of screen names or user IDs')
        .example('twilight users < screen_names.txt', 'Get user profiles for the given screen names')
        .command('statuses', 'Get full status payloads from stream of status IDs')
        .example('twilight statuses < ids.txt', 'Retrieve full tweets for each status ID line in ids.txt')
        .command('rest --help', 'Print out list of Twitter REST API endpoints')
        .options({
        help: {
            description: 'print this help message',
            alias: 'h',
            type: 'boolean',
        },
        verbose: {
            description: 'print extra output',
            alias: 'v',
            type: 'boolean',
        },
        version: {
            description: 'print version',
        },
    });
    var argv = argvparser.argv;
    if (argv.verbose) {
        loge_1.logger.level = loge_1.Level.debug;
    }
    process.on('SIGINT', function () {
        loge_1.logger.error('Ctrl+C :: SIGINT!');
        process.exit(130);
    });
    if (argv.help) {
        argvparser.showHelp();
        if (argv._[0] == 'rest') {
            showRestHelp();
        }
    }
    else if (argv.version) {
        console.log(require('../package').version);
    }
    else {
        argv = argvparser.demand(1).check(function (argv) {
            var command = argv._[0];
            if (!(command in commands)) {
                throw new Error("Unrecognized command: " + command);
            }
            return true;
        }).argv;
        var command = argv._[0];
        commands[command](argvparser, function (error) {
            if (error) {
                console.error(error.toString());
                process.exit(1);
            }
            process.exit(0);
        });
    }
}
exports.main = main;
