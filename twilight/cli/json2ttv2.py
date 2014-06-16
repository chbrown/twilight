import os
import re
import bz2
import json
import argparse
from collections import Counter
from twilight.lib import filesystem, tweets

import logging
logger = logging.getLogger(__name__)


json_gz_to_ttv2_bz2_expected_reduction = (0.18, 0.50)
json_to_ttv2_bz2_expected_reduction = (0.015, 0.07)


def read_line(line):
    '''
    Returns tuple ('tweet' | 'delete' | 'limit' | 'empty' | 'error', TTV2_bytestring | None)
    '''
    if line.isspace():
        return 'empty', None

    try:
        obj = json.loads(line)
    except (UnicodeDecodeError, ValueError), exc:
        logger.debug('Error parsing JSON (%r): %r', exc, line)
        return 'error', None

    if 'limit' in obj:
        return 'limit', None

    if 'delete' in obj:
        return 'delete'. None

    try:
        tweet = tweets.TTV2.from_dict(obj)
        line_ttv2_unicode = unicode(tweet)
        line_ttv2_bytes = line_ttv2_unicode.encode('utf8')

        return 'tweet', line_ttv2_bytes
    except KeyError, exc:
        logger.error('Error parsing tweet (%r): %r', exc, line)
        return 'error', None


def convert(json_filepath, ttv2_filepath):
    # the given json_filepath can be either gzip'ed or bzip2'ed or not
    json_fp = filesystem.open_with_autodecompress(json_filepath)
    # the resulting file at ttv2_path will always be bzip2'ed
    ttv2_fp = bz2.BZ2File(ttv2_filepath, 'w')
    try:
        for line in json_fp:
            result, ttv2 = read_line(line)
            print >> ttv2_fp, ttv2
            yield result
    finally:
        ttv2_fp.close()
        json_fp.close()


def cleanup(json_filepath, ttv2_filepath):
    # check output before deleting
    ttv2_size = os.path.getsize(ttv2_filepath)
    json_size = os.path.getsize(json_filepath)
    # reduction will generally be in the (0.05, 0.5) interval
    reduction = float(ttv2_size) / float(json_size)
    logger.debug('reduced to %.2f of original size', reduction)

    if json_filepath.endswith('.json.gz'):
        min_reduction, max_reduction = json_gz_to_ttv2_bz2_expected_reduction
    else:
        min_reduction, max_reduction = json_to_ttv2_bz2_expected_reduction

    if min_reduction < reduction < max_reduction:
        logger.warn('Deleting original file: %s', json_filepath)
        os.remove(json_filepath)
    else:
        logger.critical('Unusual size reduction; not deleting original file: %s', json_filepath)


def main(parser):
    '''
    Convert .json and .json.gz files to .ttv2.bz2 files
    json2ttv2 looks at /data/chbrown/twitter/*.json{,.gz} files and sequentially ttv2'izes them.
    To check if it's behaving:
    bzcat yourfile.ttv2.bz2 | awk 'BEGIN{FS="\\t"}{print NF}' # should only output 26's
    '''
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        description=__doc__)
    parser.add_argument('--paths', nargs='+', help='Directories or files to convert')
    opts, _ = parser.parse_known_args()

    openfiles = [os.path.basename(filepath) for filepath in filesystem.openfilepaths()]

    for filepath in filesystem.walk(opts.paths):
        ttv2_filepath = re.sub('.json(.gz)?', '.ttv2.bz2', filepath)

        if not filepath.endswith(('.json', '.json.gz')):
            logger.info('Ignoring non-JSON file %s', filepath)
            continue

        if os.path.basename(filepath) in openfiles:
            logger.info('Ignoring open file %s', filepath)
            continue

        if os.path.exists(ttv2_filepath):
            logger.info('Target already exists: %s', ttv2_filepath)
            continue

        logger.info('Converting %s -> %s', filepath, ttv2_filepath)
        print Counter(convert(filepath, ttv2_filepath))

        cleanup(filepath, ttv2_filepath)
