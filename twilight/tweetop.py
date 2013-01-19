#!/usr/bin/env python
import re
import sys
import argparse
import ujson as json
from twitter import map_stdin, stdout, stderr, Binner, TTV2, flatten_dict

def main():
    parser = argparse.ArgumentParser(description='Common Twitter Operations')
    parser.add_argument('op', type=str)
    parser.add_argument('--unit', type=str, help="Use with --op bin")
    parser.add_argument('--count', type=float, help="Use with --op bin")
    parser.add_argument('--files', nargs='*', help="Use with --op glomcsv")
    opts = parser.parse_args()

    if opts.op == 'json2ttv2':
        def mapper(line):
            tweet = TTV2.from_json(line)
            stdout(tweet.to_tsv().encode('utf-8'))
        map_stdin(mapper)
    elif opts.op == 'bin':
        from datetime import datetime
        val_func = lambda t: t.text_rtl_to_ltr()
        if opts.unit == 'm':
            # YYYYMMDD:HHMM = created_at[:13]
            key_func = lambda t: t.t.get('created_at')[:13]
        elif opts.unit == 'h':
            # YYYYMMDD:HH = created_at[:11]
            h = opts.count
            def key_func(t):
                dt = datetime.strptime(t.get('created_at'), '%Y%m%dT%H%M%S')
                hours = int((dt.hour + (dt.minute / 60.0))/h)*h + (h/2)
                return '%sT%02d0000' % (dt.strftime('%Y%m%d'), hours)
        elif opts.unit == 'd':
            # YYYYMMDD = created_at[:8]
            key_func = lambda t: t.get('created_at')[:8]

        binner = Binner(key_func, val_func)
        def mapper(line):
            tweet = TTV2.from_tsv(line)
            binner.add(tweet)
        map_stdin(mapper)

    elif opts.op == 'sa':
        from lexicons import arabsenti, finn, liwc

        # u"\"!.:;,/\\#+"
        strip = dict((ord(ch), u' ') for ch in u'!"#%\'()*+,-./:;<=>?@[\]^_`{|}~')

        def mapper(line):
            try:
                key, text = line.split(u'\t', 1)
                at_mentions = re.findall(r'@\w{4,}', text)
                tokens = text.lower().translate(strip).split()

                stderr('key: %s, %d chars, %d words' % (key, len(text), len(tokens)))

                sentiments = dict(finn=finn.tokens(tokens),
                    arabsenti=arabsenti.tokens(tokens),
                    liwc=liwc.tokens(tokens),
                    wc=len(tokens),
                    chars=len(text),
                    at_mentions=len(at_mentions))

                stdout('%s\t%s' % (key, json.dumps(sentiments)))
            except:
                stderr('%s appears to have no key!' % line[:10000])

        map_stdin(mapper)

        # cat ~/Desktop/syria-snippet.keytext.gz | gunzip | cut -c -100000 | ./sa
        # cat ~/Desktop/syria-snippet.keytext.gz | gunzip | ./sa
        # | gzip > ~/Desktop/syria-snippet.keysenti.gz

    elif opts.op == 'json2csv':
        import csv
        # cat syria_20120615-20120829.sentiments | cli json2csv > syria_20120615-20120829.csv
        rows = []
        cols = ['key']
        for line in sys.stdin:
            tabs = line.split('\t')
            json_dict = json.loads(tabs[-1])
            keyvals = dict(flatten_dict(json_dict))
            keyvals['key'] = '-'.join(tabs[0:-1])
            rows.append(keyvals)
            cols = cols + list(set(keyvals.keys()) - set(cols))

        cols = cols[0:1] + sorted(cols[1:])
        writer = csv.DictWriter(sys.stdout, cols, restval='', extrasaction='raise', dialect=csv.excel)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    elif opts.op == 'glomcsv':
        filenames = opts.files

        initialized = False
        for filename in filenames:
            basename = filename.replace('.csv', '')
            with open(filename) as fp:
                headers = fp.readline().strip()
                if not initialized:
                    stdout('file,%s' % headers)
                    initialized = True
                for line in fp:
                    stdout('%s,%s' % (basename, line.strip()))


    elif opts.op == 'geo':
        from twitter.geo import first_country_containing
        # call like:
        # $ cat /usr/local/data/twitter/nafrica_2012-06* | gunzip | ./geofilter | gzip > ~/data/nafrica_arabic_2012-06.tsv.gz

        def arabic_countries(tweet):
            if tweet.is_arabic:
                country = first_country_containing(tweet)
                if country:
                    tsv = u'\t'.join([country.ISO3] + tweet.flatten())
                    stdout(tsv.encode('utf-8'))
                else:
                    stderr('No coord info!')

        def arabic(tweet):
            if tweet.is_arabic:
                stdout(tweet.tsv().encode('utf-8'))

        def everything(tweet):
            stdout(tweet.tsv().encode('utf-8'))

        map_stdin(everything)
    else:
        print "That command line call wasn't recognized"

if __name__ == '__main__':
    main()
