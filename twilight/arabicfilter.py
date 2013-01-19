#!/usr/bin/env python
import sys
sys.path.append('..')
from flatten import colnames

text_col = colnames.index('text')

counter = 0
raw = 'START'
while raw:
    try:
        values = raw.decode('utf-8').split(u'\t')
        tweet_text = values[text_col]
        char_codes = map(ord, tweet_text)

        arabic_chars = [char_code for char_code in char_codes if 1536 <= char_code <= 1791]
        if len(arabic_chars) > (len(char_codes) / 2.0):
            sys.stdout.write('%s\n' % tweet_text.encode('utf-8'))

        if counter % 10000 == 0:
            sys.stderr.write('\r  #%10d   ' % counter)
            sys.stderr.flush()
        counter += 1
    except Exception, exc:
        print exc

    raw = sys.stdin.readline()

sys.stderr.write('\n%d\n\n' % counter)
sys.stdout.flush()
