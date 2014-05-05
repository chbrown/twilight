import time
from collections import namedtuple

json_gz_to_ttv2_bz2_expected_reduction = (0.18, 0.50)
json_to_ttv2_bz2_expected_reduction = (0.02, 0.07)

whitespace_consolidation = {ord('\t'): u' ', ord('\n'): u' ', ord('\r'): u''}


def parse_javascript_date(dt_string):
    return time.strptime(dt_string, '%a %b %d %H:%M:%S +0000 %Y')


def datetime_to_iso_string(dt):
    return time.strftime('%Y%m%dT%H%M%S', dt)


def reformat_date(dt_string):
    # if '+0000' in dt_string: ...
    # else: return dt_string
    dt = parse_javascript_date(dt_string)
    return datetime_to_iso_string(dt)


class Tweet(object):
    def __unicode__(self):
        return u'\t'.join(self)


TTV1_tuple = namedtuple('TTV1_tuple', (
    'id_str', 'created_at', 'text', 'retweeted', 'retweet_count',
    'coordinates', 'geo', 'user_id_str', 'user_created_at',
    'user_screen_name', 'user_name', 'user_location', 'user_url',
    'user_statuses_count', 'user_followers_count', 'user_friends_count',
    'user_geo_enabled', 'user_time_zone', 'user_lang', 'user_utc_offset'))


class TTV1(TTV1_tuple, Tweet):
    @classmethod
    def from_dict(cls, dict_):
        user = dict_['user']
        coordinates = dict_['coordinates']
        coords = u''
        if coordinates and coordinates['type'] == u'Point':
            coords = u','.join(map(unicode, coordinates['coordinates']))
        return cls(
            dict_['id_str'],
            reformat_date(dict_['created_at']),
            dict_['text'].translate(whitespace_consolidation).replace('&amp;', '&').replace('&quot;', '"').replace('&apos;', "'"),
            u'T' if dict_['retweeted'] else u'F',
            unicode(dict_['retweet_count']),
            coords,
            user['id_str'],
            reformat_date(user['created_at']),
            user['screen_name'],
            user['name'].translate(whitespace_consolidation),
            user['location'].translate(whitespace_consolidation),
            user['url'].translate(whitespace_consolidation) if user['url'] else '',
            str(user['statuses_count']),
            str(user['followers_count']),
            str(user['friends_count']),
            u'T' if user['geo_enabled'] else u'F',
            user['time_zone'] or '',
            user['lang'],
            str(user['utc_offset'] or '')
        )


TTV2_tuple = namedtuple('TTV2_tuple', ('id', 'created_at', 'text', 'coordinates', 'place_id', 'place_str',
        'in_reply_to_status_id', 'in_reply_to_screen_name', 'retweet_id',
        'retweet_count', 'user_screen_name', 'user_id', 'user_created_at',
        'user_name', 'user_description', 'user_location', 'user_url',
        'user_statuses_count', 'user_followers_count', 'user_friends_count',
        'user_favourites_count', 'user_geo_enabled', 'user_default_profile',
        'user_time_zone', 'user_lang', 'user_utc_offset'))


class TTV2(TTV2_tuple, Tweet):
    '''TTV2 is 'tweet tab-separated format version 2'

    Specification:

     0: tweet_id
     1: created_at parsed into YYYYMMDDTHHMMSS, implicitly UTC
     2: text, newlines and tabs converted to spaces, html entities replaced, t.co urls resolved
     3: lon,lat
     4: place_id
     5: place_str
     6: in_reply_to_status_id
     7: in_reply_to_screen_name
     8: retweet_id id of the original tweet
     9: retweet_count
    10: user.screen_name
    11: user.id
    12: user.created_at parsed into YYYYMMDDTHHMMSS
    13: user.name
    14: user.description
    15: user.location
    16: user.url
    17: user.statuses_count
    18: user.followers_count
    19: user.friends_count
    20: user.favourites_count
    21: user.geo_enabled
    22: user.default_profile
    23: user.time_zone
    24: user.lang
    25: user.utc_offset
    '''
    @classmethod
    def from_dict(cls, dict_):
        created_at = reformat_date(dict_['created_at'])

        text = dict_['text'].translate(whitespace_consolidation)
        for url in dict_['entities']['urls']:
            text = text.replace(url['url'], url['expanded_url'] or url['url'])
        for url in dict_['entities'].get('media', []):
            text = text.replace(url['url'], url['media_url'] or url['url'])
        text = text.\
            replace('&amp;', '&').replace('&quot;', '"').replace('&apos;', "'").\
            replace('&gt;', '>').replace('&lt;', '<')

        coords = '%.8f,%.8f' % tuple(dict_['coordinates']['coordinates']) if dict_['coordinates'] else ''
        place_id = ''
        place_str = ''
        if dict_['place']:
            place_id = dict_['place']['id']
            if dict_['place']['full_name'] == dict_['place']['country']:
                place_str = dict_['place']['full_name']
            else:
                place_str = '%s; %s' % (dict_['place']['full_name'], dict_['place']['country'])

        retweet_id = dict_['retweeted_status']['id_str'] if 'retweeted_status' in dict_ and dict_['retweeted_status'] else ''

        user = dict_.get('user', {})
        user_created_at = reformat_date(user['created_at']) if 'created_at' in user else ''
        return cls(
            dict_['id_str'],
            created_at,
            text,
            coords,
            place_id,
            place_str,
            dict_['in_reply_to_status_id_str'] or u'',
            dict_['in_reply_to_screen_name'] or u'',
            retweet_id,
            unicode(dict_.get('retweet_count', '')),
            user.get('screen_name', ''),
            user.get('id_str', ''),
            user_created_at,
            user.get('name', u'').translate(whitespace_consolidation),
            (user.get('description') or u'').translate(whitespace_consolidation),
            (user.get('location') or u'').translate(whitespace_consolidation),
            (user.get('url') or u'').translate(whitespace_consolidation),
            unicode(user.get('statuses_count', 0)),
            unicode(user.get('followers_count', 0)),
            unicode(user.get('friends_count', 0)),
            unicode(user.get('favourites_count', 0)),
            u'T' if user.get('geo_enabled', False) else u'F',
            u'T' if user.get('default_profile', False) else u'F',
            user.get('time_zone') or u'',
            user.get('lang') or u'',
            unicode(user.get('utc_offset') or '')
        )

    @classmethod
    def from_line(cls, line):
        '''
        Strip the newline from the line, decode bytestring into utf-8, and split into its 26 fields
        '''
        return cls(*line.rstrip('\n').decode('utf8').split(u'\t'))
