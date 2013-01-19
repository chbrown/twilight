#!/usr/bin/env python
import sys
import argparse
from twilight import stderr, stdout

def main():
    parser = argparse.ArgumentParser(description='''
        Search ttv2 files for matches in a certain bounding box.
        geogrep expects raw ttv2 on STDIN.''')
    parser.add_argument('north', type=float)
    parser.add_argument('east', type=float)
    parser.add_argument('south', type=float)
    parser.add_argument('west', type=float)
    opts = parser.parse_args()
    north, east, south, west = opts.north, opts.east, opts.south, opts.west

    matches = 0
    total = 0

    for line in sys.stdin:
        lon_lat = line.split('\t', 5)[3]
        if lon_lat != '':
            lon, lat = map(float, lon_lat.split(','))
            if (opts.north >= lat >= opts.south) and (opts.east >= lon >= opts.west):
                matches += 1
                stdout(line)
        total += 1
        if total % 1000 == 0:
            stderr('\r%.2f%% of %d' % ((matches * 100.0) / total, total))

if __name__ == '__main__':
    main()
