import os
import json
import sys
import subprocess

# root refers to the root package directory, this file's containing directory's parent directory
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
__version__ = json.load(open(os.path.join(root, 'package.json')))['version'].encode('utf8')


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


def map_stdin(fn):
    """
    Streams stdin line-by-line through the given `fn`, directly to stdout.
      each line will be UTF-8 decoded, such that fn will get a unicode string
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
            fn(line.decode('utf8'))
        except (KeyError, ValueError), exc:
            stderr(u'%s\n  --> %s' % (exc, line.decode('utf8')))
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
        stdout(line.encode('utf8'))
