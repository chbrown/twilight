#!/usr/bin/env python
import bz2
import os
import argparse
from glob import glob
from twilight.ttv import TTV2
import redis
from twilight import stderr, stderrn

r = None

''' Database:

    twitteragg/read                     set of filenames we've read
    twitteragg/failed                   set of filenames we made errors in

    twitteragg/{name}                   int, total count for this name
    twitteragg/{name}/rt                int, total RT's captured
    twitteragg/{name}/lang              hash(lang -> int) total tweets in "lang"

    twitteragg/{name}/{datehour}        int, total count for that hour
    twitteragg/{name}/{datehour}/rt     int, RT's in that hour
    twitteragg/{name}/{datehour}/lang   hash(lang -> int) tweets in "lang" for that hour

'''


def readLine(line, named_prefix):
    tweet = TTV2.from_tsv(line.strip())
    dated_prefix = named_prefix + '/' + tweet.get('created_at')[:11]

    for prefix in [named_prefix, dated_prefix]:
        r.incr(prefix)
        if tweet.get('text').startswith('RT'):
            r.incr('{prefix}/rt'.format(prefix=prefix))
        r.hincrby('{prefix}/lang'.format(prefix=prefix), tweet.get('user_lang'), 1)


def readFile(filepath):
    filename = os.path.basename(filepath)
    prefix = 'twitteragg/' + filename.split('_')[0]

    stderr('         ' + filename)
    nrows = -1
    with bz2.BZ2File(filepath, 'r') as ttv2_fd:
        for nrows, line in enumerate(ttv2_fd):
            readLine(line.decode('utf-8'), prefix)
            if nrows % 1000 == 0:
                stderr('\r' + str(nrows))
    stderrn('\r' + str(nrows))


def main():
    parser = argparse.ArgumentParser(description='Aggregate metrics on Twitter crawls into redis')
    parser.add_argument(
        '--files', default='/usr/local/data/twitter/*.ttv2.bz2', help='Glob of ttv2.bz2 files')
    parser.add_argument(
        '--host', default='127.0.0.1', help='Redis server host')
    opts = parser.parse_args()

    try:
        # if ping takes longer than 100ms, we die
        impatient_r = redis.StrictRedis(host=opts.host, socket_timeout=0.1)
        impatient_r.ping()
    except redis.ConnectionError, error:
        stderrn(error)
        exit(1)

    global r
    r = redis.StrictRedis(host=opts.host, socket_timeout=1)
    keys = len(r.keys('twitteragg/*'))
    stderrn('Established Redis connection. {keys} twitteragg/* keys.'.format(keys=keys))

    for ttv2_filepath in glob(opts.files):
        ttv2_filename = os.path.basename(ttv2_filepath)

        # DEL myset
        # SADD myset "one.txt"
        # (integer) 1
        # SADD myset "one.txt"
        # (integer) 0
        novel = r.sadd('twitteragg/read', ttv2_filename)
        if novel:
            try:
                readFile(ttv2_filepath)
            except KeyboardInterrupt, exc:
                stderrn()
                stderrn('Ctrl+C KeyboardInterrupt: your counts will be partial')
                exit(130)  # Ctrl+C exit code
            except Exception, exc:
                stderrn()
                stderrn(ttv2_filename + ' failed: ' + str(exc))
                r.sadd('twitteragg/failed', ttv2_filename)
        else:
            stderrn(ttv2_filename + ' already read')
