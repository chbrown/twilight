# Crawling quickstart

Install from `npm`:

    npm install -g twilight

Or github (to make sure you're getting the latest):

    npm install -g git://github.com/chbrown/twilight

### From my `/etc/supervisor/conf.d/*`

```bash
[program:justinnnnnn]
user=chbrown
command=twitter-curl
    --query "track=loveyabiebs,belieber,bietastrophe"
    --user twittahname --pass twittahpass
    --file /usr/local/data/twitter/justin_TIMESTAMP.json
    --timeout 86400
```

## `twitter-curl` options

* `--query` can be any `track=whatever` or `locations=-18,14,68,44` etc.
* `--file` shouldn't require creating any directions, and the TIMESTAMP bit
   will be replaced by a filesystem-friendly iso representation of whenever
   the program is started.
* `--timeout` (seconds) the program will die with error code 1 after this
   amount of time. Don't specify a timeout if you don't want this.
* `--interval` (seconds) the amount of time to allow for silence from Twitter
   before dying. Defaults to 600 (10 minutes).

Because in most cases of error the script simply dies, this approach only
really makes sense if you're putting it behind some process monitor. (By the way,
I've tried most of them: monitd, daemontools's svc, god, bluepill,
node-forever---and supervisord is by far the best.)

The script does not abide by any Twitter backoff requirement, but I've never
had any trouble with backoff being enforced by Twitter. It's more than curl,
though, because it checks that it's receiving data. Often, with `curl` and
`PycURL`, my connection would be dropped by Twitter, but no end signal would be sent.
My crawler would simply hang, expecting data, but would not try to reconnect.

But beyond that, it doesn't provide anything more than `curl`.

### Stats

* RSS usage per-process is between 20-40MB.
* VSZ on a machine running six of these crawlers is 80-90MB.


#### Other contents

    pip install -e git://github.com/chbrown/twilight.git#egg=twilight

The Python and Javascript components are complementary.
The Javascript offers crawlers, Python provides post-processing.
