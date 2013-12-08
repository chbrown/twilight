import sys
import argparse
from twilight.lib import language, tweets

import logging
logger = logging.getLogger(__name__)


def main(parser):
    '''
    Filter TTV2-formatted tweets on STDIN,
    '''
    parser.add_argument('input', nargs='?', type=argparse.FileType('r'), default=sys.stdin)
    parser.add_argument('output', nargs='?', type=argparse.FileType('w'), default=sys.stdout)
    opts = parser.parse_args()

    for i, line in enumerate(opts.input):
        tweet = tweets.TTV2.from_line(line)
        if language.is_arabic(tweet.text):
            print >> opts.output, line.encode('utf8')

        if i % 10000 == 0:
            logger.info('Progress: line %d', i)
