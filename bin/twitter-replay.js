#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var async = require('async');
var events = require('events');
var fs = require('fs');
var glob = require('glob');
var http = require('http');
var logger = require('winston');
var path = require('path');
var stream = require('stream');
var util = require('util');
var zlib = require('zlib');

var LineStream = module.exports = function() {
  stream.Transform.call(this, {decodeStrings: true});
  this._writableState.objectMode = false;
  this._readableState.objectMode = true;
};
util.inherits(LineStream, stream.Transform);
LineStream.prototype._chunk = function(buffer, encoding) {
  if (encoding == 'buffer' || encoding === undefined) encoding = 'utf8';
  var chunk = buffer.toString(encoding);
  this.push(chunk);
};
LineStream.prototype._transform = function(chunk, encoding, callback) {
  // assert encoding == 'buffer'
  var buffer = (this._buffer && this._buffer.length) ? Buffer.concat([this._buffer, chunk]) : chunk;
  var start = 0;
  var end = buffer.length;
  for (var i = 0; i < end; i++) {
    if (buffer[i] === 13 || buffer[i] === 10) {
      this._chunk(buffer.slice(start, i), encoding);
      if (buffer[i] === 13 && buffer[i + 1] === 10) { // '\r\n'
        i++;
      }
      start = i + 1;
    }
  }
  this._buffer = buffer.slice(start);
  callback();
};
LineStream.prototype._flush = function(callback) {
  if (this._buffer && this._buffer.length) {
    this._chunk(this._buffer);
  }
  callback();
};

function now() { return (new Date()).getTime(); }

var TwitterReplayer = function(files, speed) {
  // files will be full filepaths with already-expanded any ~'s
  this.files = files;
  this.speed = speed;
  this.file_index = 0;

  this.realtime_started = now();
  logger.debug('Twitter replayer initialized at time: %d', this.realtime_started);
  this.data_started = undefined;

  events.EventEmitter.call(this);
};
util.inherits(TwitterReplayer, events.EventEmitter);
TwitterReplayer.prototype.play = function() {
  var self = this;
  var file = this.files[this.file_index];
  if (file === undefined) {
    logger.debug('Read all files');
    // process.exit(0);
    return;
  }

  logger.debug('Reading %s', file);

  // jumping / seeking to some start position is too hard with a gzip stream
  var file_stream = fs.createReadStream(file);
  if (file.match(/\.gz$/)) {
    file_stream = file_stream.pipe(zlib.createGunzip());
  }
  var line_stream = file_stream.pipe(new LineStream());

  // we don't want to keep the file or line stream open outside this function
  // so we send in callbacks to different methods of the stream.
  // bind doesn't work!
  var line_stream_pause = function() { line_stream.pause(); };
  var line_stream_resume = function() { line_stream.resume(); };
  line_stream.on('data', function(chunk) {
    self.push(chunk.trim(), line_stream_pause, line_stream_resume);
  });

  line_stream.on('end', function() {
    logger.debug('Reached end of %s', file);
    self.file_index++;
    self.play();
  });
};
TwitterReplayer.prototype.push = function(line, pause, resume) {
  // given a line (a string), emit it if applicable.
  // if it is too early to emit it, just wait until the necessary time elapses,
  // emit it, and then call resume
  //   pause signature: function()
  //   resume signature: function()
  var self = this;

  if (line === '') {
    logger.debug('Ignoring empty line: "%s"', line);
    return;
  }

  var tweet = JSON.parse(line);
  // twitter uses created_at, other sources might use postedTime
  var date_string = tweet.created_at || tweet.postedTime;
  if (!date_string && tweet.info) {
    logger.debug('Ignoring metadata line: %s', line);
    return;
  }

  var tweet_date = new Date(date_string).getTime();
  if (this.data_started === undefined) {
    this.data_started = tweet_date;
    logger.debug('Initialized "data_started" to %s', tweet_date);
  }

  // calculate where we should be in simulated time. should we do this outside push?
  var realtime_elapsed = now() - this.realtime_started;
  var data_elapsed = realtime_elapsed * this.speed;
  var data_now = this.data_started + data_elapsed;

  // if the simulated time that we are currently at is greater than this data
  // point, we wait. otherwise, pump it though and test the next point.
  if (tweet_date < data_now) {
    this.emit('data', line);
    return;
  }

  // tweet_date is after simulation_now, so we pause and wait
  var simulated_ms_until_tweet_date = tweet_date - data_now;
  var realtime_ms_until_tweet_date = simulated_ms_until_tweet_date / this.speed;
  logger.debug('Waiting %d simulated ms = %d real ms', simulated_ms_until_tweet_date, realtime_ms_until_tweet_date);

  pause();
  setTimeout(function() {
    self.emit('data', line);
    resume();
  }, realtime_ms_until_tweet_date);
};
TwitterReplayer.prototype.pause = function() {
  throw new Error('Not yet implemented');
};



var replay = exports.replay = function(opts) {
  /** opts = {
    hostname: 'localhost',
    port: 8080,
    speed: 1
  } */
  var twitter_replayer = new TwitterReplayer(opts.files, opts.speed);
  twitter_replayer.play();

  http.createServer(function(req, res) {
    if (req.url == '/play') {
      twitter_replayer.play();
      res.end('playing');
    }
    else if (req.url == '/pause') {
      twitter_replayer.pause();
      res.end('paused');
    }
    else if (req.url == '/test') {
      res.end('success');
    }
    else {
      // only levels of 'error' or 'debug' are sent to STDERR
      logger.debug('Connected client with headers', req.headers);
      res.writeHead(200, {'Content-Type': 'application/json'});
      var fwd = function(chunk) {
        res.write(chunk);
        res.write('\n');
      };
      twitter_replayer.addListener('data', fwd);
      res.on('close', function() {
        logger.debug('Removing listener from dead connection');
        twitter_replayer.removeListener('data', fwd);
        // res.end(); // maybe this is belaboring the point?
      });
    }
  }).listen(opts.port, opts.hostname, function() {
    logger.info('Twitter replayer serving at %s:%d', opts.hostname, opts.port);
  });
};

function main() {
  var full = require('optimist')
    .usage('Usage: twitter-replay <files or glob strings>')
    .describe({
      hostname: 'hostname to listen on',
      port: 'port to listen on',
      speed: 'speed multiplier, relative to realtime (decimal)',

      help: 'print this help message',
      verbose: 'print extra output',
      version: 'print version',
    })
    .boolean(['help', 'verbose', 'version'])
    .alias({verbose: 'v'})
    .default({
      hostname: '127.0.0.1',
      port: 7050,
      speed: 1,
    });

  var argv = full.argv;
  logger.level = argv.verbose ? 'debug' : 'info';

  if (argv.help) {
    full.showHelp();
  }
  else if (argv.version) {
    var package_json_path = path.join(__dirname, '../package.json');
    fs.readFile(package_json_path, 'utf8', function(err, data) {
      var obj = JSON.parse(data);
      console.log(obj.version);
    });
  }
  else {
    // > Note, that since [async.map] applies the iterator to each item in
    // > parallel there is no guarantee that the iterator functions will
    // > complete in order, however the results array will be in the same order
    // > as the original array.
    async.map(argv._, function(arg, callback) {
      var glob_string = arg.replace(/^~/, process.env.HOME);
      if (glob_string.match(/\*/)) {
        // only resolve globs for wildcards
        glob(glob_string, callback);
      }
      else {
        callback(null, glob_string);
      }
    }, function(err, filess)  {
      // flatten file lists:
      var files = [].concat.apply([], filess);
      logger.debug('Reading %d files', files.length);
      replay({
        files: files,
        hostname: argv.hostname,
        port: argv.port,
        speed: argv.speed,
      });
    });
  }
}

if (require.main === module) { main(); }
