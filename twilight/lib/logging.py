import sys


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
