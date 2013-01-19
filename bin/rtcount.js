#!/usr/bin/env node
Object.prototype.toArray = function() {
  var self = this;
  return Object.keys(this).map(function(key) {
    return [key, self[key]];
  });
};

var buf = '';
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk) {
  buf += chunk;
  var parts = buf.split(/\n/);
  buf = parts[parts.length];
  for (var i = 0, l = parts.length - 1; i < l; i++) {
    var obj = parseLine(parts[i]);
    if (obj && obj.text)
      processTweet(obj);
  }
}).on('end', end);

function parseLine(line, callback) {
  try {
    return JSON.parse(line);
  }
  catch (exc) {
    return null;
  }
}

var retweets = {};
function processTweet(tweet) {
  if (tweet.text.match(/RT/)) {
    var text = tweet.text.replace(/\n/g, ' ');
    if (retweets[text] === undefined) {
      retweets[text] = [];
    }
    var ticks = Date.parse(tweet.created_at);
    retweets[text].push(ticks);
  }
}

function end() {
  retweets.toArray().sort(function(a, b) {
    return a[1].length - b[1].length;
  }).forEach(function(item) {
    var text = item[0], dates = item[1];
    if (dates.length > 1)
      console.log(dates.length + '\t' + text + '\t' + dates);
  });

  process.exit();
}

process.on('SIGINT', function() {
  console.error("Ctrl+C :: SIGINT!");
  end();
});
