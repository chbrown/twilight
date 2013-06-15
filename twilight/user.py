#!/usr/bin/env python
import os
import re
import csv
import sys
import argparse
import json
import random
from twython import Twython
from twilight import stderrn

# import tweepy
# auth = tweepy.auth.OAuthHandler(consumer_key, consumer_secret)
# auth.set_access_token(access_key, access_pass)
# api = tweepy.API(auth)

# tweets = {} #Maps IDs to Tweet Objects
# for tweet_id in ids_list:
#     tweets[tweet_id] = api.get_status(tweet_id)


def main():
    parser = argparse.ArgumentParser(description='Crawl all tweets from a given user.',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('screen_name', help='Twitter user to crawl')
    parser.add_argument('output', nargs='?', default='-', help='output file')
    parser.add_argument('--accounts', default='~/.twitter', help='File to use for OAuth credentials')
    opts = parser.parse_args()

    screen_name = opts.screen_name.replace('@', '')

    account = None
    accounts_filepath = re.sub('^~', os.environ['HOME'], opts.accounts)
    with open(accounts_filepath) as accounts_fd:
        accounts = [row for row in csv.DictReader(accounts_fd)]
        account = random.sample(accounts, 1)[0]
    client = Twython(
        account['consumer_key'], account['consumer_secret'],
        account['access_token'], account['access_token_secret'])

    params = dict(
        screen_name=screen_name,
        include_entities='true',
        contributor_details='true',
        include_rts='true',
        count=200)

    counts = []
    output = sys.stdout if opts.output == '-' else open(opts.output, 'a')

    while True:
        tweets = client.get_user_timeline(**params)
        count = len(tweets)
        for tweet in tweets:
            json.dump(tweet, output)
            output.write('\n')

        counts.append(count)
        if count > 0:
            try:
                params['max_id'] = tweets[-1]['id'] - 1
            except Exception, exc:
                print exc, tweets
                return

        empties = len([count for count in counts if count < 10])
        if empties > 5:
            break

    stderrn('Done downloading %d tweets from %s' % (sum(counts), screen_name))


if __name__ == '__main__':
    main()
