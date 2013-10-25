#!/usr/bin/env python
import shapefile
import sys
import re
import argparse
from collections import namedtuple
from twilight.ttv import TTV2

import logging
logger = logging.getLogger(__name__)


def mean(floats):
    return sum(floats)/len(floats)


def bbox_contains(bbox, x, y):
    # x: lon, y: lat
    # minimum longitude, minimum latitude, maximum longitude, maximum latitude = bbox
    # west, south, east, north = bbox
    return (bbox[0] < x < bbox[2]) and (bbox[1] < y < bbox[3])


def polygon_contains(poly, x, y):
    '''Thanks, http://www.ariel.com.au/a/python-point-int-poly.html'''
    n = len(poly)
    inside = False

    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside


class Area(object):
    def __init__(self, shape, **kw):
        # save the various parameters
        self.shape = shape
        # kw will have these keys: FIPS, ISO2, ISO3, UN, NAME, AREA, POP2005, REGION, SUBREGION, LON, LAT
        for field, value in kw.items():
            setattr(self, field, value)

        # and also process them into more usable values:

        # the given shape is a shapefile._Shape instance
        # `parts` denotes the indices of the beginning and ending of each polygon in this shape
        parts = shape.parts.tolist() + [len(shape.points)]
        # an Area is composed of polygons, often just one, sometimes many (Indonesia has 260, Canada: 475!)
        self.polygons = [shape.points[i:j] for i, j in zip(parts, parts[1:])]

    def contains(self, lon, lat):
        # rough check, first
        if bbox_contains(self.shape.bbox, lon, lat):
            # then the exact check (could be quite slow!)
            if any(polygon_contains(poly, lon, lat) for poly in self.polygons):
                return True

        return False

    def __str__(self):
        bbox_lonlat = 'SW: [%0.7f, %0.7f] NE: [%0.7f, %0.7f]' % tuple(self.shape.bbox)
        return '%s (%s/%s) %s' % (self.NAME, self.ISO2, self.ISO3, bbox_lonlat)


def read_shapefile(filepath):
    reader = shapefile.Reader(filepath)
    # Field name: the name describing the data at this column index.
    # Field type: the type of data at this column index.
    #   Types can be: Character, Numbers, Longs, Dates, or Memo.
    # Field length: the length of the data found at this column index.
    # Decimal length: the number of decimal places found in "Number" fields.
    fields = reader.fields[1:]
    # the first field is called "DeletionFlag", which seems to be just trash (thus the [1:])
    field_names = [field_name for field_name, field_type, field_length, decimal_length in fields]

    # shapefile shapeTypes:
    #   NULL = 0
    #   POINT = 1
    #   POLYLINE = 3
    #   POLYGON = 5
    #   MULTIPOINT = 8
    #   POINTZ = 11
    #   POLYLINEZ = 13
    #   POLYGONZ = 15
    #   MULTIPOINTZ = 18
    #   POINTM = 21
    #   POLYLINEM = 23
    #   POLYGONM = 25
    #   MULTIPOINTM = 28
    #   MULTIPATCH = 31
    for field_values, shape in zip(reader.iterRecords(), reader.iterShapes()):
        kw = dict(zip(field_names, field_values))
        # e.g., kw = {'SUBREGION': 14, 'NAME': 'Zambia', 'AREA': 74339, 'REGION': 2, 'LON': 26.32, 'ISO3': 'ZMB', 'ISO2': 'ZM', 'FIPS': 'ZA', 'UN': 894, 'LAT': -14.614, 'POP2005': 11478317}
        # or {'AREA': 0, 'FIPS': 'TW', 'ISO2': 'TW', 'ISO3': 'TWN', 'LAT': 23.754, 'LON': 120.946, 'NAME': 'Taiwan', 'POP2005': 0, 'REGION': 0, 'SUBREGION': 0, 'UN': 158}
        yield Area(shape, **kw)


def main():
    parser = argparse.ArgumentParser(description='''
        Count TTV2 on STDIN by country / date.
        Output format: date<TAB>country<TAB>hashtag
        ''', formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('--map', help='ESRI Shapefile filepath',
        default='/data/chbrown/TM_WORLD_BORDERS-0.3/TM_WORLD_BORDERS-0.3.shp')

    parser.add_argument('-v', '--verbose', action='store_true', help='Log extra output')
    opts = parser.parse_args()

    level = logging.DEBUG if opts.verbose else logging.INFO
    # logging.basicConfig(format='%(levelname)-8s %(asctime)14s (%(name)s): %(message)s', level=level)
    logging.basicConfig(format='%(levelname)-8s %(message)s', level=level)
    logger.debug('Logging with level >= %s (%s)', logging.root.level, logging.getLevelName(logging.root.level))

    countries = list(read_shapefile(opts.map))

    def countries_containing(lon, lat):
        # should reorder countries into the most popular first so that we find them quicker
        for country in countries:
            if country.contains(lon, lat):
                yield country

    def first_country_containing(lon, lat):
        for country in countries_containing(lon, lat):
            return country

    Tweet = namedtuple('Tweet', TTV2.cols)

    if sys.stdin.isatty():
        raise IOError('You must pipe in uncompressed TTV2-formatted tweets')

    for line in sys.stdin:
        tweet = Tweet(*line.split('\t'))
        if tweet.coordinates != '':
            lon, lat = map(float, tweet.coordinates.split(','))
            # total += 1
            # if total % 1000 == 0:
            #     stderr('\r%.2f%% of %d' % ((matches * 100.0) / total, total))
            country_match = first_country_containing(lon, lat)
            if country_match:
                # melt out each hashtag into its own line
                for hashtag in re.findall(r'#\S+', tweet.text):
                    timestamp = tweet.created_at  # [:8]
                    print '\t'.join((timestamp, country_match.ISO3, hashtag))
        else:
            logger.debug('No coordinates: %s', tweet.id)

if __name__ == '__main__':
    main()
