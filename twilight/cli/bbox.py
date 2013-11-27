import sys
import argparse
from twilight.lib import geo, tweets

import logging
logger = logging.getLogger(__name__)


def main(parser):
    '''
    Search TTV2 lines for matches within a certain bounding box
    '''
    parser.add_argument('north', type=float)
    parser.add_argument('east', type=float)
    parser.add_argument('south', type=float)
    parser.add_argument('west', type=float)
    parser.add_argument('input', nargs='?', type=argparse.FileType('r'), default=sys.stdin)
    parser.add_argument('output', nargs='?', type=argparse.FileType('w'), default=sys.stdout)
    opts = parser.parse_args()

    bounding_box = geo.BoundingBox(opts.west, opts.south, opts.east, opts.north)

    for i, line in enumerate(opts.input):
        line = line.decode('utf8').rstrip('\n')
        tweet = tweets.TTV2(*line.split(u'\t'))

        if tweet.coordinates != '':
            lon, lat = map(float, tweet.coordinates.split(','))
            if bounding_box.contains(lon, lat):
                print >> opts.output, line.encode('utf8')
        if i % 1000 == 0:
            logger.debug('Progress: line # %d', i)
