#!/usr/bin/env node
// Usage:
// just stream newline-separated json tweets through it.
// Ctrl+C when necessary or will exit when STDIN ends.

function parseJSON(s) {
  try { return JSON.parse(s); }
  catch (exc) { return null; }
}

var buf = '';
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk) {
  buf += chunk;
  var parts = buf.split(/\n/);
  buf = parts[parts.length];
  for (var i = 0, l = parts.length - 1; i < l; i++) {
    var obj = parseJSON(parts[i]);
    if (obj && obj.text)
      processTweet(obj);
  }
}).on('end', end);


var retweets = {};
function processTweet(tweet) {
  if (tweet.text.match(/RT/)) {
    var text = tweet.text.replace(/\s+/g, ' '); // brutal
    if (retweets[text] === undefined) {
      retweets[text] = [];
    }
    var ticks = Date.parse(tweet.created_at);
    retweets[text].push(ticks);
  }
}

function end() {
  var retweets_array = [];
  for (var text in retweets) {
    retweets_array.push({text: text, dates: retweets[text]});
  }

  retweets_array.sort(function(a, b) {
    return a.dates.length - b.dates.length;
  }).forEach(function(retweet) {
    if (retweet.dates.length > 1) {
      console.log(retweet.dates.length + '\t' + retweet.text + '\t' + retweet.dates.join(','));
    }
  });

  process.exit();
}

process.on('SIGINT', function() {
  console.error("Ctrl+C :: SIGINT!");
  end();
});
