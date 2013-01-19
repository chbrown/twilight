#!/usr/bin/env python
import sys
import time
import subprocess
import ujson as json  # ujson returns python None for json null


def stderr(s):
    sys.stderr.write(s)
    sys.stderr.flush()

def stderrn(s=''):
    stderr('%s\n' % s)

def stdout(s):
    sys.stdout.write(s)
    sys.stdout.flush()

def stdoutn(s=''):
    stdout('%s\n' % s)

def stdout_tabs(*args):
    stdout('\t'.join(args))
    stdout('\t')

def sh(raw_args):
    args = map(str, raw_args)
    print '$ %s' % ' '.join(args)
    return subprocess.check_output(args)

def flatten_dict(d, prefix=None):
    prefix = prefix or []
    for k, v in d.items():
        if isinstance(v, dict):
            for keyval in flatten_dict(v, prefix + [k]):
                yield keyval
        else:
            yield ('.'.join(prefix + [k]), v)


class Tweet(object):
    translations = {ord('\t'): u' ', ord('\n'): u' ', ord('\r'): u''}

    @classmethod
    def parse_js_date(cls, s):
        return time.strptime(s, '%a %b %d %H:%M:%S +0000 %Y')

    @classmethod
    def date_to_compact(cls, dt):
        return time.strftime('%Y%m%dT%H%M%S', dt)

    def __init__(self, values):
        self.values = values

    @classmethod
    def from_json(cls, tweet_json_string):
        return cls.from_dict(json.loads(tweet_json_string))

    @classmethod
    def from_tsv(cls, line):
        return cls(line.split(u'\t'))

    def to_tsv(self):
        return u'\t'.join(self.values)

    def get(self, key):
        return self.values[self.cols.index(key)]

    def set(self, key, val):
        self.values[self.cols.index(key)] = val

    @property
    def is_arabic(self):
        # more than half arabic = is arabic
        text = self.get('text')
        return len([ch for ch in text if 1536 <= ord(ch) <= 1791]) > (len(text) / 2)

    def text_rtl_to_ltr(self):
        # if arabic were capitals: abcdefZYXUlokpTRQNML
        #         it would become: abcdefUXYZlokpLMNQRT
        chars = list(self.get('text'))
        span_start = None
        span_end = None
        for i, ch in enumerate(chars):
            chord = ord(ch)
            if 1536 <= chord <= 1791:
                # arabic char!
                if not span_start:
                    span_start = i
                span_end = i
            elif not chord == 32 and span_start:
                # it's not a space, and we ARE in an Arabic span.
                chars[span_start:span_end+1] = chars[span_end:span_start-1:-1]
                span_start = None

        return u''.join(chars)


def map_stdin(fn):
    """
    Streams stdin line-by-line through the given `fn`, directly to stdout.
      each line will be utf-8 decoded, such that fn will get a unicode string
    signature of fn: `def fn(unicode_line):`
    The return value of fn is discarded
    When `fn` raises an error besides KeyboardInterrupt, or EOFError, this
        method will write the error to stderr and continue with the next line.
    It does not fuck with stdout, but will log errors to stderr
    If KeyboardInterrupt, EOFError are seen, the loop will exit.
    """
    line = sys.stdin.readline()
    while line:
        try:
            fn(line.decode('utf-8'))
        except (KeyError, ValueError), exc:
            stderr(u'%s\n  --> %s' % (exc, line.decode('utf-8')))
        except (KeyboardInterrupt, EOFError):
            stderr(u'\n  -- Interrupted, exiting --\n')
            break

        line = sys.stdin.readline()

    stderr('  -- Done --')


class Binner(object):
    # Each line of output will be just a datetime/key and a bunch of texts.
    def __init__(self, key_fn, val_fn):
        self.key_fn = key_fn
        self.val_fn = val_fn
        self.buffer = []
        self.key = None

    def add(self, tweet):
        """
        The idea is that I'll take a gzipped (.gz) list of flattened tweets (.ttv1),
        e.g. syria_20120615-20120829.ttv1.gz, and ...
        $ zcat syria_*.ttv1.gz | tweetop bin 6h > syria_20120906.texts
        """
        new_key, new_val = self.key_fn(tweet), self.val_fn(tweet)
        if new_key != self.key:
            if self.key:
                self.flush()
            self.key = new_key
        self.buffer.append(new_val)

    def flush(self):
        line = u'%s\t%s' % (self.key, u' '.join(self.buffer))
        self.buffer = []
        stdout(line.encode('utf-8'))
