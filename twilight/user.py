#!/usr/bin/env python
import sys
import argparse
import json
# import os
import requests
from twilight import stderrn

api = 'https://api.twitter.com/1/'


def main():
    parser = argparse.ArgumentParser(description='Crawl all tweets from a given user.')
    parser.add_argument('--output', default='-', help='output file (defaults to STDOUT)')
    parser.add_argument('-u', '--username', help='Twitter user to use to crawl')
    parser.add_argument('-p', '--password', help='Password for crawl connections.')
    parser.add_argument('--screen_name', help='output file (defaults to STDOUT)')
    opts = parser.parse_args()

    auth = (opts.username, opts.password)
    params = dict(
        screen_name=opts.screen_name,
        include_entities='true',
        contributor_details='true',
        include_rts='true',
        count=200)

    counts = []
    output = sys.stdout if opts.output == '-' else open(opts.output, 'a')

    while True:
        r = requests.get(api + 'statuses/user_timeline.json', auth=auth, params=params)
        tweets = r.json()
        count = len(tweets)
        for tweet in tweets:
            json.dump(tweet, output)
            output.write('\n')

        counts.append(count)
        if count > 0:
            params['max_id'] = tweets[-1]['id'] - 1

        empties = len([count for count in counts if count < 10])
        if empties > 5:
            break

    stderrn('Done downloading %d tweets from %s.' % (sum(counts), opts.screen_name))


if __name__ == '__main__':
    main()
