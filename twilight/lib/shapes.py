import shapefile


def read_shapefile(filepath):
    '''Read shapefile at filepath with the pyshp library

    yields tuples: (polygons, bbox, attributes)
    '''
    reader = shapefile.Reader(filepath)
    # reader.fields is a list of 4-tuples: (Field name, Field type, Field length, Decimal length)
    #
    # >>> reader.fields
    # [
    #     ('DeletionFlag', 'C', 1, 0),
    #     ['FIPS', 'C', 2, 0],
    #     ['ISO2', 'C', 2, 0],
    #     ['ISO3', 'C', 3, 0],
    #     ['UN', 'N', 3, 0],
    #     ['NAME', 'C', 50, 0],
    #     ['AREA', 'N', 7, 0],
    #     ['POP2005', 'N', 10, 0],
    #     ['REGION', 'N', 3, 0],
    #     ['SUBREGION', 'N', 3, 0],
    #     ['LON', 'N', 8, 3],
    #     ['LAT', 'N', 7, 3]
    # ]
    #
    # Field name: the name describing the data at this column index.
    # Field type: the type of data at this column index.
    #   Types can be: Character, Numbers, Longs, Dates, or Memo.
    # Field length: the length of the data found at this column index.
    # Decimal length: the number of decimal places found in "Number" fields.
    #
    # the first field, called "DeletionFlag", seems to be just trash (thus the [1:])
    field_names = [field_name for field_name, _, _, _ in reader.fields[1:]]
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
    for record, shape in zip(reader.iterRecords(), reader.iterShapes()):
        # All of the shapes in the TM_WORLD_BORDERS dataset have shape.shapeType == 5
        attributes = dict(zip(field_names, record))
        # Example attributes, for some of the countries in the TM_WORLD_BORDERS dataset:
        # >>> attributes
        # {
        #     'AREA': 74339,
        #     'FIPS': 'ZA',
        #     'ISO2': 'ZM',
        #     'ISO3': 'ZMB',
        #     'LAT': -14.614,
        #     'LON': 26.32,
        #     'NAME': 'Zambia',
        #     'POP2005': 11478317,
        #     'REGION': 2,
        #     'SUBREGION': 14,
        #     'UN': 894,
        # }
        # >>> attributes
        # {
        #     'AREA': 0,
        #     'FIPS': 'TW',
        #     'ISO2': 'TW',
        #     'ISO3': 'TWN',
        #     'LAT': 23.754,
        #     'LON': 120.946,
        #     'NAME': 'Taiwan',
        #     'POP2005': 0,
        #     'REGION': 0,
        #     'SUBREGION': 0,
        #     'UN': 158,
        # }
        # the given shape is a shapefile._Shape instance
        # `shape.parts` denotes the indices of the beginning and ending of each polygon in this shape
        # a shape may be composed of multiple polygons, sometimes many (Indonesia has 260, Canada: 475!),
        # though often a country is just one
        # even with multiple polygons, though, the shape's points are just a long list, and the shape.parts
        # is used to differentiate between the polygons within that list
        parts = shape.parts.tolist() + [len(shape.points)]
        polygons = [shape.points[i:j] for i, j in zip(parts, parts[1:])]

        yield polygons, shape.bbox, attributes
