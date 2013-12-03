twilight
========

Tools for accessing the `Twitter API
v1.1 <https://dev.twitter.com/docs/api/1.1/overview>`__ with paranoid
timeouts and de-pagination.

Node.js

-  ``twitter-curl`` for querying the streaming API (``/sample.json`` and
   ``/filter.json``).
-  ``rtcount`` for pulling out the retweets from a stream of JSON
   tweets, and counting them.

Python

-  ``json2ttv2`` converts directories full of Twitter ``.json`` files
   into ``.ttv2`` files, bzip2'ing them, and ensuring that the result is
   within a reasonable size of the source (greater than 2%, but less
   than 6%) before deleting the original json.
-  ``twitter-user`` pulls down the ~3,200 (max) tweets that are
   accessible for a given user (also depends on the ``~/.twitter`` auth
   file).

Crawling quickstart
===================

Install from ``npm``:

::

    npm install -g twilight

Or github (to make sure you're getting the most up-to-date version):

::

    npm install -g git://github.com/chbrown/twilight

Authenticate
------------

This app uses only OAuth 1.0A, which is mandatory. As of June 11, 2013,
`basic HTTP authentication is
disabled <https://dev.twitter.com/docs/faq#17750>`__ in the Twitter
Streaming API. So get some OAuth credentials together `real
quick <https://github.com/chbrown/autoauth>`__ and make a csv file that
looks like this:

+-----------------+--------------------+-----------------+-------------------------+
| consumer\_key   | consumer\_secret   | access\_token   | access\_token\_secret   |
+=================+====================+=================+=========================+
| ziurk0An7...    | VKmTsGrk2JjH...    | 91505165...     | VcLOIzA0mkiCSbU...      |
+-----------------+--------------------+-----------------+-------------------------+
| 63Yp9EG4t...    | DhrlIQBMUaoL...    | 91401882...     | XJa4HQKMgqfd7ee...      |
+-----------------+--------------------+-----------------+-------------------------+
| ...             | ...                | ...             | ...                     |
+-----------------+--------------------+-----------------+-------------------------+

There **must** be a header line with *exactly* the following values:

-  consumer\_key
-  consumer\_secret
-  access\_token
-  access\_token\_secret

Tab / space seperated is fine, and any other columns will simply be
ignored, e.g., if you want to record the ``screen_name`` of each
account. Also, order doesn't matter -- your headers just have to line up
with their values.

The ``twitter-curl`` script expects to find this file at ``~/.twitter``,
but you can specify a different path with the ``--accounts`` command
line argument.

From my ``/etc/supervisor/conf.d/*``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(See http://supervisord.org/ to get that all set up.)

.. code:: bash

    [program:justinnnnnn]
    user=chbrown
    command=twitter-curl
        --filter "track=loveyabiebs,belieber,bietastrophe"
        --file /data/twitter/justin_TIMESTAMP.json
        --timeout 86400
        --interval 3600
        --ttv2

``twitter-curl`` options
------------------------

-  ``--accounts`` should point to a file with OAuth Twitter account
   credentials. Currently, the script will simply use a random row from
   this file.
-  ``--filter`` can be any ``track=whatever`` or
   ``locations=-18,14,68,44`` etc. A ``querystring``-parsable string. If
   no filter is specified, it will use the spritzer at ``/sample.json``
-  ``--file`` shouldn't require creating any directions, and the
   TIMESTAMP bit will be replaced by a filesystem-friendly iso
   representation of whenever the program is started.

.. code:: javascript

    // Specifically:
    var stamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    // stamp == '2013-06-07T15-47-49'

-  ``--timeout`` (seconds) the program will die with error code 1 after
   this amount of time. Don't specify a timeout if you don't want this.
-  ``--interval`` (seconds) the amount of time to allow for silence from
   Twitter before dying. Also exits with code 1. Defaults to 600 (10
   minutes).
-  ``--ttv2`` (boolean) output TTV2 normalized flat tweets instead of
   full JSON.

Because in most cases of error the script simply dies, this approach
only really makes sense if you're putting it behind some process
monitor. (By the way, I've tried most of them: monitd, daemontools's
svc, god, bluepill, node-forever---and supervisord is by far the best.)

The script does not abide by any Twitter backoff requirement, but I've
never had any trouble with backoff being enforced by Twitter. It's more
than curl, though, because it checks that it's receiving data. Often,
with ``curl`` and ``PycURL``, my connection would be dropped by Twitter,
but no end signal would be sent. My crawler would simply hang, expecting
data, but would not try to reconnect.

But beyond that, without ``--ttv2``, it doesn't provide anything more
than ``curl``.

TTV2
----

TTV2 is the Tweet tab-separated format version 2, the specification is
below. Fields are 1-indexed for easy AWKing (see Markdown source for
0-indexing).

0.  tweet\_id
1.  created\_at parsed into YYYYMMDDTHHMMSS, implicitly UTC
2.  text, newlines and tabs converted to spaces, html entities replaced,
    t.co urls resolved
3.  lon,lat
4.  place\_id
5.  place\_str
6.  in\_reply\_to\_status\_id
7.  in\_reply\_to\_screen\_name
8.  retweet\_id id of the original tweet
9.  retweet\_count
10. user.screen\_name
11. user.id
12. user.created\_at parsed into YYYYMMDDTHHMMSS
13. user.name
14. user.description
15. user.location
16. user.url
17. user.statuses\_count
18. user.followers\_count
19. user.friends\_count
20. user.favourites\_count
21. user.geo\_enabled
22. user.default\_profile
23. user.time\_zone
24. user.lang
25. user.utc\_offset

This format is not the default, and will be the output only when you use
the ``--ttv2`` option.

Examples
--------

Install `json <https://github.com/zpoley/json-command>`__ first:
``npm install json``. It's awesome.

::

    twitter-curl --filter 'track=bootstrap' | json -C text
    twitter-curl --filter 'track=bootstrap' | json -C user.screen_name text
    twitter-curl --filter 'track=انتخابات' | json -C text
    twitter-curl --filter 'track=sarcmark,%F0%9F%91%8F' | json -C text

It supports unicode: انتخابات is Arabic for "elections," and
``decodeURIComponent('%F0%9F%91%8F')`` is the `"CLAPPING HANDS"
(U+1F44F) <http://www.fileformat.info/info/unicode/char/1f44f/index.htm>`__
character.

If you use a filter with url-escaped characters in supervisord, note
that supervisord Python-interpolates strings, so you'll need to escape
the percent signs, e.g.:

::

    [program:slowclap]
    command=twitter-curl --filter "track=%%F0%%9F%%91%%8F" --file /tmp/slowclap.json

TTV2 Example
~~~~~~~~~~~~

Instead of JSON, you can use AWK to look at the TTV2:

::

    twitter-curl --filter 'track=data,science' --ttv2 | awk 'BEGIN{FS="\t"}{print $4,$3}'

Stats
-----

-  RSS usage per-process is between 20-40MB.
-  VSZ on a machine running six of these crawlers is 80-90MB.

Python contents vs. Javascript contents
---------------------------------------

::

    easy_install -U twilight

The Python and Javascript components are mostly complementary. The
Javascript offers crawlers, Python provides post-processing.

Testing with Travis CI
----------------------

The tested CLI commands now check for OAuth in specific environment
variables before reading the given ``--accounts`` file or the default
one (``~/.twitter``).

To get tests to run on Travis CI, we can use ``travis`` command line
tool to encrypt a quad of valid Twitter OAuth credentials so that only
Travis CI can see them.

Put together a file that looks like this (call it ``twilight.env``):

::

    consumer_key=bepLTQD5ftZCjqhXgkuJW
    consumer_secret=jZ4HEYgNRKwJykbh5ptmcqV7v0o2WODdiMTF1fl6B9X
    access_token=167246169-e1XTUxZqLnRaEyBF8KwOJtbID26gifMpAjukN5vz
    access_token_secret=OVm7fJt8oY0C9kBsvych6Duq5pNIUxwagG143HdR

And then, from within the root directory of this git repository, run the
following sequence:

::

    gem install travis
    travis encrypt -s -a < twilight.env

``.travis.yml`` should now have those variables, but encrypted with
Travis CI's public key.

License
-------

Copyright © 2011–2013 Christopher Brown. `MIT
Licensed <https://github.com/chbrown/twilight/blob/master/LICENSE>`__.
