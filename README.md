# Crawling quickstart

Install from `npm`:

    npm install -g twilight

Or github (to make sure you're getting the latest):

    npm install -g git://github.com/chbrown/twilight

## Authenticate

As of 11 June 2013, [basic HTTP authentication is disabled](https://dev.twitter.com/docs/faq#17750)
in the Twitter Streaming API. So get some OAuth credentials together [real quick](https://github.com/chbrown/autoauth) and make a csv file that looks like this:

| consumer_key | consumer_secret | oauth_token | oauth_token_secret |
|--------------|-----------------|-------------|--------------------|
| ziurk0An7... | VKmTsGrk2JjH... | 91505165... | VcLOIzA0mkiCSbU... |
| 63Yp9EG4t... | DhrlIQBMUaoL... | 91401882... | XJa4HQKMgqfd7ee... |
| ...          | ...             | ...         | ...                |

There **must** be a header line with _exactly_ the following values:

  * consumer_key
  * consumer_secret
  * oauth_token
  * oauth_token_secret

Tab / space seperated is fine, and any other columns will simply be ignored, e.g., if you want to record the `screen_name` of each account. Also, order doesn't matter -- your headers just have to line up with their values.

The `twitter-curl` script expects to find this file at `~/.twitter`,
but you can specify a different path with the `--accounts` command line argument.

### From my `/etc/supervisor/conf.d/*`

(See http://supervisord.org/ to get that all set up.)

```bash
[program:justinnnnnn]
user=chbrown
command=twitter-curl
    --query "track=loveyabiebs,belieber,bietastrophe"
    --file /usr/local/data/twitter/justin_TIMESTAMP.json
    --timeout 86400
    --interval 3600
    --ttv2
```

## `twitter-curl` options

* `--accounts` should point to a file with OAuth Twitter account credentials.
  Currently, the script will simply use a random row from this file.
* `--query` can be any `track=whatever` or `locations=-18,14,68,44` etc. A
  querystring parsable string.
* `--file` shouldn't require creating any directions, and the TIMESTAMP bit
  will be replaced by a filesystem-friendly iso representation of whenever
  the program is started.

      // Specifically:
      var stamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      // stamp == '2013-06-07T15-47-49'

* `--timeout` (seconds) the program will die with error code 1 after this
   amount of time. Don't specify a timeout if you don't want this.
* `--interval` (seconds) the amount of time to allow for silence from Twitter
   before dying. Also exits with code 1. Defaults to 600 (10 minutes).
* `--ttv2` (boolean) output TTV2 normalized flat tweets instead of full JSON.

Because in most cases of error the script simply dies, this approach only
really makes sense if you're putting it behind some process monitor. (By the way,
I've tried most of them: monitd, daemontools's svc, god, bluepill,
node-forever---and supervisord is by far the best.)

The script does not abide by any Twitter backoff requirement, but I've never
had any trouble with backoff being enforced by Twitter. It's more than curl,
though, because it checks that it's receiving data. Often, with `curl` and
`PycURL`, my connection would be dropped by Twitter, but no end signal would be sent.
My crawler would simply hang, expecting data, but would not try to reconnect.

But beyond that, without `--ttv2`, it doesn't provide anything more than `curl`.

## TTV2

TTV2 is the Tweet tab-separated format version 2, the specification is below.
Fields are 1-indexed for easy AWKing.

  0. tweet_id
  1. created_at parsed into YYYYMMDDTHHMMSS, implicitly UTC
  2. text, newlines and tabs converted to spaces, html entities replaced, t.co urls resolved
  3. lon,lat
  4. place_id
  5. place_str
  6. in_reply_to_status_id
  7. in_reply_to_screen_name
  8. retweet_id id of the original tweet
  9. retweet_count
  10. user.screen_name
  11. user.id
  12. user.created_at parsed into YYYYMMDDTHHMMSS
  13. user.name
  14. user.description
  15. user.location
  16. user.url
  17. user.statuses_count
  18. user.followers_count
  19. user.friends_count
  20. user.favourites_count
  21. user.geo_enabled
  22. user.default_profile
  23. user.time_zone
  24. user.lang
  25. user.utc_offset

This format is not the default, and will be the output only when you use the `--ttv2` option.

## Examples

Install [json](https://github.com/zpoley/json-command) first: `npm install json`. It's awesome.

    twitter-curl --query 'track=bootstrap' | json -C text
    twitter-curl --query 'track=bootstrap' | json -C screenname,text

Or with plain AWK on TTV2:

    twitter-curl --query 'track=data,science' --ttv2 | awk 'BEGIN{FS="\t"}{print $4,$3}'

### Stats

* RSS usage per-process is between 20-40MB.
* VSZ on a machine running six of these crawlers is 80-90MB.


#### Other contents

    pip install -e git://github.com/chbrown/twilight.git#egg=twilight

The Python and Javascript components are complementary.
The Javascript offers crawlers, Python provides post-processing.

## License

Copyright © 2011–2013 Christopher Brown. [MIT Licensed](LICENSE).
