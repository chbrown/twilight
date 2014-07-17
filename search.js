/*jslint node: true */
var logger = require('loge');
var querystring = require('querystring');
var streaming = require('streaming');
var url = require('url');

var twilight = require('./');

var searchLoop = function(url) {
  logger.info(url);

  var request_opts = {
    url: url,
    method: 'GET',
    // oauth: opts.oauth,
    timeout: 10000,
    json: true,
    // data: argv.data,
  };

  twilight.requestWithOAuth(request_opts, function(err, response) {
    if (err) {
      logger.error(err.toString());
      throw err;
    }

    streaming.readToEnd(response, function(err, chunks) {
      if (err) throw err;

      var body = chunks.join('');
      var res = JSON.parse(body);

      logger.debug('%d statuses; meta: %j', res.statuses.length, res.search_metadata);

      res.statuses.forEach(function(status) {
        process.stdout.write(JSON.stringify(status));
      });

      setImmediate(function() {
        var url = '/search/tweets.json' + res.search_metadata.next_results;
        searchLoop(url);
      });
    });
  });
};

var seed = '/search/tweets.json?q=issue3&count=100&include_entities=1';
searchLoop(seed);

  // "search_metadata": {
  //   "completed_in": 0.061,
  //   "max_id": 489416497702244350,
  //   "max_id_str": "489416497702244351",
  //   "next_results": "?max_id=489314030599675903&q=issue3&count=100&include_entities=1",
  //   "query": "issue3",
  //   "refresh_url": "?since_id=489416497702244351&q=issue3&include_entities=1",
  //   "count": 100,
  //   "since_id": 0,
  //   "since_id_str": "0"
  // }
