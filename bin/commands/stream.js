#!/usr/bin/env node
/*jslint node: true */
var fs = require('fs');
var path = require('path');
var stream = require('../../stream');
var credentials = require('../../credentials');

module.exports = function(argv) {
  var optimist = require('optimist')
    .usage('Usage: twilight stream --filter "track=bieber"')
    .describe({
      accounts: 'filepath of twitter oauth csv',
      filter: 'parameters for filter endpoint',
      sample: 'parameters for sample endpoint',
      file: 'output target (- for STDOUT)',
      interval: 'die after a silence of this many seconds',
      timeout: 'die this many seconds after starting, no matter what',
      useragent: 'User-Agent header to send in HTTP request',
      compress: 'request gzip / deflate compression from twitter',
      decompress: "decompress gzip'ed or deflated responses",
      ttv2: 'convert to TTV2 (defaults to false, meaning JSON)',
    })
    .boolean(['ttv2'])
    .default({
      interval: 600,
      timeout: 'never',
      compress: false,
      decompress: true,
      file: '-',
      accounts: '~/.twitter',
      useragent: 'twilight/twitter-curl',
    });

  argv = optimist.check(function(argv) {
    if (argv.query) {
      throw new Error([
        'argument deprecated.',
        '--query is no longer supported and I am throwing this exception for your own good.',
      ].join(' '));
    }

    if (argv.filter && argv.sample) {
      throw new Error('You cannot specify both --filter and --sample.');
    }
  }).argv;

  var twitter_stream = new stream.TwitterStream(argv)
  .on('error', function(err) {
    console.error('cli error');
    // process.exit(1);
  })
  .on('end', function() {
    console.error('cli end');
    // twitter_stream.end();
    twitter_stream.request.abort();
    // console.error('  req', twitter_stream.request);
    twitter_stream.response.socket.end();
    twitter_stream.response.socket.destroy();
    twitter_stream.response.socket.unref();
    // console.error('  res', twitter_stream.response);
    // debugger;
  });

  credentials.getOAuth(argv.accounts, function(err, oauth) {
    if (err) throw err;

    twitter_stream.options.oauth = oauth;

    if (argv.file == '-') {
      // destination is STDOUT
      twitter_stream.pipe(process.stdout);
    }
    else {
      // destination is a file
      var timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      var filepath = argv.file.replace(/TIMESTAMP/, timestamp);
      var fs_stream = fs.createWriteStream(filepath, {flags: 'a', mode: '0664'});
      twitter_stream.pipe(fs_stream);
    }

    twitter_stream.start();
  });

  // hard reset timeout (optional)
  if (argv.timeout && argv.timeout != 'never') {
    setTimeout(function() {
      twitter_stream.shutdown(new Error('Elapsed lifetime of ' + argv.timeout + 's.'));
    }, argv.timeout * 1000);
  }
};
