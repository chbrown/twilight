

def polygon_contains(poly, x, y):
    '''
    poly = [(x, y), (x, y), ...]  # list of (lon, lat) tuples completely describing the boundary of a polygon
    x = float                     # x = longitude = easting coordinate
    y = float                     # y = latitude = northing coordinate

    Comes straight from http://www.ariel.com.au/a/python-point-int-poly.html,
    with some PEP-8 compliance

    This runs way faster with pypy
    '''
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


class BoundingBox(object):
    '''
    BoundingBox(minimum_longitude, minimum_latitude, maximum_longitude, maximum_latitude)

    minimum_longitude = float # western-most coordinate
    minimum_latitude = float  # southern-most coordinate
    maximum_longitude = float # eastern-most coordinate
    maximum_latitude = float  # northern-most coordinate

    # longitude is the easting coordinate, along the x-axis
    # latitude is the northing coordinate, along the y-axis
    '''
    min_x = None
    min_y = None
    max_x = None
    max_y = None

    def __init__(self, min_x, min_y, max_x, max_y):
        self.min_x = min_x
        self.min_y = min_y
        self.max_x = max_x
        self.max_y = max_y

    def contains(self, x, y):
        '''
        Check whether the given point lies within this box's boundaries

        x = lon = easting coordinate
        y = lat = northing coordinate
        '''
        return (self.min_x <= x <= self.max_x) and (self.min_y <= y <= self.max_y)

    def __str__(self):
        return 'SW: [%0.7f, %0.7f] NE: [%0.7f, %0.7f]' % (self.min_x, self.min_y, self.max_x, self.max_y)


class NamedArea(object):
    '''
    NamedArea(name, description, polygons, bounding_box)

    A NamedArea is like, a country, or something.
    Can span multiple polygons, so it's kind of more than just a shape.

    name = str         # identifier, like an ISO3 country code
    description = str  # full name, like the convention English country name
    polygons = [[(lat, lon)]] # list of lists of
    bounding_box = BoundingBox object
    '''
    name = None
    description = None
    polygons = None
    bounding_box = None

    def __init__(self, name, description, polygons, bounding_box):
        self.name = name
        self.description = description
        self.polygons = polygons
        self.bounding_box = bounding_box

    def contains(self, x, y):
        # first, do coarse-grained check (by bounding box)
        if self.bounding_box.contains(x, y):
            # then the exact check (could be quite slow!)
            if any(polygon_contains(poly, x, y) for poly in self.polygons):
                return True

        return False

    def __str__(self):
        return '%s [%s] (%d polygons): %s' % (self.name, self.description, len(self.polygons), self.bounding_box)

    @classmethod
    def from_tm_world_borders(cls, polygons, bbox, attributes):
        # TM_WORLD_BORDERS datasets have shapefiles with these field names:
        #   FIPS, ISO2, ISO3, UN, NAME, AREA, POP2005, REGION, SUBREGION, LON, LAT
        return cls(attributes['ISO3'], attributes['NAME'], polygons, BoundingBox(*bbox))
