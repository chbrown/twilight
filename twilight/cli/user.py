import sys
import json
import argparse
from twython import Twython
from twilight.lib import accounts

import logging
logger = logging.getLogger(__name__)


def main(parser):
    '''
    Retrieve all tweets for a given user; Twitter will generally provide to the last 3200.
    '''
    parser.add_argument('screen_name', help='Twitter user to crawl')
    parser.add_argument('output', nargs='?', type=argparse.FileType('w'), default=sys.stdout, help='output file')
    parser.add_argument('--accounts', default='~/.twitter', help='File to use for OAuth credentials')
    opts = parser.parse_args()

    account_credentials = accounts.from_filepath(opts.accounts)
    client = Twython(
        account_credentials['consumer_key'], account_credentials['consumer_secret'],
        account_credentials['access_token'], account_credentials['access_token_secret'])

    params = dict(
        screen_name=opts.screen_name.replace('@', ''),
        include_entities='true',
        contributor_details='true',
        include_rts='true',
        count=200)

    # responses is a list of integers that record how many tweets we got back from Twitter for each request
    # this is useful so that we can retry a couple times on empty responses, but not forever
    responses = []
    max_empty_responses = 5

    while sum(count == 0 for count in responses) < max_empty_responses:
        tweets = client.get_user_timeline(**params)
        for tweet in tweets:
            print >> opts.output, json.dumps(tweet).encode('utf8')

        if len(tweets) > 0:
            params['max_id'] = tweets[-1]['id'] - 1

        responses += [len(tweets)]

    logger.info('Downloaded %d tweets by %s', sum(responses), opts.screen_name)
