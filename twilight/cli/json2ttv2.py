# from twilight.ttv import TTV2
import os
import bz2
import json
import argparse
from twilight.lib import filesystem, tweets

import logging
logger = logging.getLogger(__name__)


def main(parser):
    '''
    Convert .json and .json.gz files to .ttv2.bz2 files
    json2ttv2 looks at /data/chbrown/twitter/*.json{,.gz} files and sequentially ttv2'izes them.
    To check if it's behaving:
    bzcat yourfile.ttv2.bz2 | awk 'BEGIN{FS="\\t"}{print NF}' # should only output 26's
    '''
    parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter, description=__doc__)
    parser.add_argument('--directory', default='/data/chbrown/twitter', help='Directory to look in for raw json files')
    # parser.add_argument('--delete', action='store_true', help='Delete after compressing?')
    # parser.add_argument('--overwrite', action='store_true', help='Overwrite existing compressed files?')
    opts = parser.parse_args()

    # filter out the openfiles, and only look at .json or .json.gz files
    openfiles = [os.path.basename(filepath) for filepath in filesystem.openfilepaths()]
    for filename in os.listdir(opts.directory):
        if filename.endswith('.json.gz') or filename.endswith('.json'):
            json_filepath = os.path.join(opts.directory, filename)
            if filename in openfiles:
                logger.info('Ignoring open file: %s', filename)
            else:
                ttv2_filename = '%s.ttv2.bz2' % filename.split('.')[0]
                ttv2_filepath = os.path.join(opts.directory, ttv2_filename)
                if os.path.exists(ttv2_filepath):
                    logger.warn('Target already exists: %s', ttv2_filename)
                else:
                    logger.info('Converting %s -> %s', filename, ttv2_filename)
                    # if os.path.exists(ttv2_filepath):
                        # logger.info('(Overwriting %s)', ttv2_filename)

                    # the given json_filepath can be either gzip'ed or bzip2'ed or not
                    # the resulting file at ttv2_path will always be bzip2'ed
                    with bz2.BZ2File(ttv2_filepath, 'w') as ttv2_fp:
                        with filesystem.open_with_autodecompress(json_filepath) as json_fp:
                            for line in json_fp:
                                line = line.decode('utf8').strip()
                                try:
                                    dict_ = json.loads(line)
                                # except UnicodeDecodeError, exc:
                                #     logger.error('Error decoding string: %s (%s)', line.strip(), exc)
                                except ValueError, exc:
                                    logger.error('Error in json.loads(%r): %s', line, exc)

                                tweet = tweets.TTV2.from_dict(dict_)
                                print >> ttv2_fp, unicode(tweet).encode('utf8')

                    # check output before deleting
                    ttv2_size = os.path.getsize(ttv2_filepath)
                    json_size = os.path.getsize(json_filepath)
                    # reduction will generally be in the (0.05, 0.5) interval
                    reduction = float(ttv2_size) / float(json_size)
                    logger.info('%0.2f%% size reduction', reduction * 100.0)

                    if filename.endswith('.json.gz'):
                        min_reduction, max_reduction = tweet.json_gz_to_ttv2_bz2_expected_reduction
                    else:
                        min_reduction, max_reduction = tweet.json_to_ttv2_bz2_expected_reduction

                    if min_reduction < reduction < max_reduction:
                        logger.warn('Deleting original file: %s', json_filepath)
                        os.remove(json_filepath)
                    else:
                        logger.critical('Unusual size reduction; not deleting original file: %s', json_filepath)
