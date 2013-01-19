import shapefile

sf = shapefile.Reader('/home/chbrown/data/borders/thematicmap-simple')
fields = [f[0] for f in sf.fields[1:]]
# records[245] = {'AREA': 0,
#  'FIPS': 'TW',
#  'ISO2': 'TW',
#  'ISO3': 'TWN',
#  'LAT': 23.754,
#  'LON': 120.946,
#  'NAME': 'Taiwan',
#  'POP2005': 0,
#  'REGION': 0,
#  'SUBREGION': 0,
#  'UN': 158}]


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


def mean(floats):
    return sum(floats)/len(floats)


def first_country_containing(tweet):
    coords = tweet['coordinates']
    if coords:
        if coords['type'] == u'Point':
            lon, lat = coords['coordinates']
        elif coords['type'] == u'Polygon':
            # u'coordinates': [[[-7.6028565, 33.4087762], [-7.4503
            lons, lats = zip(*coords['coordinates'][0])
            lon, lat = mean(lons), mean(lats)
        else:
            lon, lat = -999, -999

        for country in countries:
            if country.bbox_contains(lon, lat):
                if country.polygons_contain(lon, lat):
                    return country
    return None


class Country(object):
    def __init__(self, record, shape):
        self.sw_lon, self.sw_lat, self.ne_lon, self.ne_lat = shape.bbox
        parts = shape.parts.tolist() + [len(shape.points)]
        self.polygons = [shape.points[i:j] for i, j in zip(parts, parts[1:])]
        for field, val in zip(fields, record):
            setattr(self, field, val)

    def bbox_contains(self, lon, lat):
         # or self.sw_lon > lon > self.ne_lon
        if self.sw_lon < lon < self.ne_lon:
            #  or self.sw_lat > lat > self.ne_lat
            if self.sw_lat < lat < self.ne_lat:
                return True
        return False

    def polygons_contain(self, lon, lat):
        return any(polygon_contains(poly, lon, lat) for poly in self.polygons)

    def __str__(self):
        return '%s (%s/%s) SW: [%0.7f, %0.7f] NE: [%0.7f, %0.7f]' % (self.NAME, self.ISO2, self.ISO3,
            self.sw_lon, self.sw_lat, self.ne_lon, self.ne_lat)

countries = [Country(record, shape) for record, shape in zip(sf.records(), sf.shapes())]
