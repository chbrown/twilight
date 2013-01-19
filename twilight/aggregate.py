#!/usr/bin/env python
import csv
import argparse
from itertools import groupby

parser = argparse.ArgumentParser(description='Common Twitter Operations')
parser.add_argument('csvfile', type=str)
parser.add_argument('--key', type=str)
parser.add_argument('--out', type=str)
# parser.add_argument('--include', nargs='*')
# parser.add_argument('--exclude', nargs='*')

opts = parser.parse_args()

with open(opts.csvfile) as fp:
    reader = csv.DictReader(fp)
    rows = list(reader)
    cols = reader.fieldnames

if opts.key == 'superfile':
    superfile_groups = [
        ['libya', 'libyan', 'gaddafi-ar', 'gaddafi', 'benghazi', 'libya-ar', 'benghazi-ar'],
        ['egypt', 'cairo', 'egypt-ar', 'cairo-ar'],
        ['gop', 'romney'],
        ['dem', 'hillary-clinton', 'barack-obama'],
        ['yemen', 'yemen-ar', 'sana', 'sana-ar'],
        ['arab-spring', 'middle-east'],
        ['anti-islam', 'morris'],
        ['embassy', 'christopher-stevens', 'american-ambassador', 'ambassador', 'consulate']]
    for row in rows:
        for superfile_group in superfile_groups:
            if row['file'] in superfile_group:
                row['superfile'] = superfile_group[0]
    def key_func(row):
        # print row
        return (row['superfile'], row['key'])

aggregate_rows = []
for group_key, group_rows in groupby(sorted(rows, key=key_func), key_func):
    superfile, dt = group_key
    group_rows = list(group_rows)
    aggregate_row = dict(superfile=superfile, dt_dummy=dt)
    for col in cols:
        try:
            aggregate_row[col] = sum(row[col] for row in group_rows)
        except:
            aggregate_row[col] = group_rows[0][col]

    aggregate_rows.append(aggregate_row)


cols += ['superfile', 'dt_dummy']

with open(opts.out, 'w') as fp:
    writer = csv.DictWriter(fp, cols)
    writer.writeheader()
    writer.writerows(aggregate_rows)


# eg: aggregate libya-egypt-12h.csv --key superfile --out libya-egypt-12h-super.csv
