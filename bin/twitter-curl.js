#!/usr/bin/env node
var fs = require('fs'),
  https = require('https'),
  argv = require('optimist').argv,
  username = argv.u,
  password = argv.p,
  query = argv.q,
  timeout = parseInt(argv.t || 600, 10) * 1000,
  last_data = Date.now(),
  timestamp = (new Date()).toISOString().slice(0, 19).replace(/:/g, '-'),
  out = process.stdout;

// node twitter-curl -u chbrown -p mypassword -q "track=bieber"
//   -f is optional, and if provided, will be used as the output filepath
//      if -f is not specified, output will be sent to standard out.
//   -t defaults to 10s, and describes how long the script will wait for new
//      data before dying. format is time in integer seconds

var options = {
  host: 'stream.twitter.com',
  path: '/1.1/statuses/filter.json',
  method: 'POST',
  auth: username + ':' + password,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept-Encoding': 'compress, gzip'
  }
};

if (argv.f) {
  var filepath = argv.f.replace(/TIMESTAMP/, timestamp);
  out = fs.createWriteStream(filepath, {flags: 'a', encoding: null, mode: '0664'});
}

var req = https.request(options, function(res) {
  res.on('data', function(d) {
    last_data = Date.now();
    out.write(d);
  });
});

req.on('error', function(e) {
  console.error(e);
});

req.write(query + '&stall_warnings=true');
req.end();


// ensure we get something every 10 seconds.
setInterval(function() {
  if (last_data < (Date.now() - timeout)) {
    console.error('TIMEOUT');
    // or DIE, hahahaha. Hopefully you've got supervisord configured.
    process.exit(1);
  }
}, timeout);
