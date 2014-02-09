import argparse
import logging

import twilight
from twilight.cli import arabic, bbox, countries, datebin, json2ttv2, sentiment, user

actions = dict(
    arabic=arabic.main,
    bbox=bbox.main,
    countries=countries.main,
    datebin=datebin.main,
    json2ttv2=json2ttv2.main,
    sentiment=sentiment.main,
    user=user.main,
)


def main():
    parser = argparse.ArgumentParser(description='Twilight Python CLI',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('action', choices=actions, help='Twilight CLI action')
    parser.add_argument('--version', action='version', version=twilight.__version__)
    parser.add_argument('-v', '--verbose', action='store_true', help='Log extra output')
    opts, _ = parser.parse_known_args()

    level = logging.DEBUG if opts.verbose else logging.INFO
    logging.basicConfig(format='%(levelname)-8s %(message)s', level=level)

    logger = logging.getLogger(__name__)
    logger.debug('Logging with level >= %s (%s)', logging.root.level, logging.getLevelName(logging.root.level))

    actions[opts.action](parser)

if __name__ == '__main__':
    main()
