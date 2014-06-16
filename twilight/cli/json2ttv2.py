import os
import re
import bz2
import json
import argparse
from twilight.lib import filesystem, tweets

import logging
logger = logging.getLogger(__name__)


json_gz_to_ttv2_bz2_expected_reduction = (0.18, 0.50)
json_to_ttv2_bz2_expected_reduction = (0.015, 0.07)


def convert_line(line_bytes):
    line_unicode = line_bytes.decode('utf8')
    line_object = json.loads(line_unicode.strip())
    line_tweet = tweets.TTV2.from_dict(line_object)
    line_ttv2_unicode = unicode(line_tweet)
    line_ttv2_bytes = line_ttv2_unicode.encode('utf8')
    return line_ttv2_bytes


def convert(json_filepath, ttv2_filepath):
    # the given json_filepath can be either gzip'ed or bzip2'ed or not
    # the resulting file at ttv2_path will always be bzip2'ed
    # nerrors = 0
    # ndeletes = 0
    # ntweets = 0
    # logger.info('{:.2%} reduction, {:d} tweets, {:d} errors, {:d} deletes'.format(
    #     reduction, ntweets, nerrors, ndeletes))

    ttv2_fp = bz2.BZ2File(ttv2_filepath, 'w')
    json_fp = filesystem.open_with_autodecompress(json_filepath)
    try:
        for line_bytes in json_fp:
            try:
                line_ttv2_bytes = convert_line(line_bytes)
                print >> ttv2_fp, line_ttv2_bytes
            except UnicodeDecodeError, exc:
                logger.error('Error decoding line: %s (%s)', line_bytes, exc)
            except ValueError, exc:
                logger.error('Error parsing JSON: %r (%s)', line_bytes, exc)
            except KeyError, exc:
                logger.error('Error reading tweet %r: %s', line_bytes, exc)
    finally:
        ttv2_fp.close()
        json_fp.close()

    cleanup(json_filepath, ttv2_filepath)


def cleanup(json_filepath, ttv2_filepath):
    # check output before deleting
    ttv2_size = os.path.getsize(ttv2_filepath)
    json_size = os.path.getsize(json_filepath)
    # reduction will generally be in the (0.05, 0.5) interval
    reduction = float(ttv2_size) / float(json_size)

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
        convert(filepath, ttv2_filepath)
