import os
import sys
import argparse
from twilight.lib import tweets
from geo import shapes
from geo.types import Feature, FeatureCollection

import logging
logger = logging.getLogger(__name__)


def main(parser):
    '''
    Add country match to TTV2 data on STDIN.
    Output format: [...TTV2 fields...]<TAB>country_iso3_code
    '''
    parser.add_argument('input', nargs='?', type=argparse.FileType('r'), default=sys.stdin)
    parser.add_argument('output', nargs='?', type=argparse.FileType('w'), default=sys.stdout)
    parser.add_argument('--map', help='ESRI Shapefile filepath',
        default=os.path.expanduser('~/corpora/TM_WORLD_BORDERS-0.3/TM_WORLD_BORDERS-0.3.shp'))
    opts = parser.parse_args()

    countries = FeatureCollection([])
    for polygons, bbox, attributes in shapes.read_shapefile(opts.map):
        # TM_WORLD_BORDERS datasets have shapefiles with these field names:
        #   FIPS, ISO2, ISO3, UN, NAME, AREA, POP2005, REGION, SUBREGION, LON, LAT
        geometry = dict(type='MultiPolygon', coordinates=polygons)
        properties = dict(name=attributes['NAME'])
        countries.features += [Feature(geometry, properties, polygons, id=attributes['ISO3'], bbox=bbox)]

    if opts.input.isatty():
        raise IOError('You must pipe in uncompressed TTV2-formatted tweets')

    for i, line in enumerate(opts.input):
        tweet = tweets.TTV2.from_line(line)

        if tweet.coordinates == '':
            logger.debug('No coordinates [%s] @%s: %s', tweet.id, tweet.user_screen_name, tweet.text)
        else:
            lon, lat = map(float, tweet.coordinates.split(','))
            # for country_match in countries.areas_containing(lon, lat):
            country_match = countries.first_feature_containing(lon, lat)
            if country_match:
                extended_line = unicode(tweet) + u'\t' + unicode(country_match.id)
                print >> opts.output, extended_line.encode('utf8')
