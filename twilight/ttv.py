from twilight import Tweet

class TTV1(Tweet):
    cols = ['id_str', 'created_at', 'text', 'retweeted', 'retweet_count', 'coordinates', 'geo', 'user_id_str', 'user_created_at', 'user_screen_name', 'user_name', 'user_location', 'user_url', 'user_statuses_count', 'user_followers_count', 'user_friends_count', 'user_geo_enabled', 'user_time_zone', 'user_lang', 'user_utc_offset']

    @classmethod
    def parse_date(cls, s):
        if '+0000' in s:
            return cls.date_to_compact(cls.parse_js_date(s))
        return s

    @classmethod
    def from_dict(cls, store):
        user = store['user']
        coordinates = store['coordinates']
        coords = u''
        if coordinates and coordinates['type'] == u'Point':
            coords = u','.join(map(unicode, coordinates['coordinates']))
        values = (
            store['id_str'],
            cls.parse_date(store['created_at']),
            store['text'].translate(cls.translations).replace('&amp;', '&').replace('&quot;', '"').replace('&apos;', "'"),
            u'T' if store['retweeted'] else u'F',
            unicode(store['retweet_count']),
            coords,
            user['id_str'],
            cls.parse_date(user['created_at']),
            user['screen_name'],
            user['name'].translate(cls.translations),
            user['location'].translate(cls.translations),
            user['url'].translate(cls.translations) if user['url'] else '',
            str(user['statuses_count']),
            str(user['followers_count']),
            str(user['friends_count']),
            u'T' if user['geo_enabled'] else u'F',
            user['time_zone'] or '',
            user['lang'],
            str(user['utc_offset'] or '')
        )
        return cls(values)

class TTV2(Tweet):
    cols = ['id', 'created_at', 'text', 'coordinates', 'place_id', 'place_str',
        'in_reply_to_status_id', 'in_reply_to_screen_name', 'retweet_id',
        'retweet_count', 'user_screen_name', 'user_id', 'user_created_at',
        'user_name', 'user_description', 'user_location', 'user_url',
        'user_statuses_count', 'user_followers_count', 'user_friends_count',
        'user_favourites_count', 'user_geo_enabled', 'user_default_profile',
        'user_time_zone', 'user_lang', 'user_utc_offset']

    # ttv2 is the tweet tab-separated format version 2:
    # the spec is:
    #   0: tweet_id
    #   1: created_at parsed into YYYYMMDDTHHMMSS, implicitly UTC
    #   2: text, newlines and tabs converted to spaces, html entities replaced, t.co urls resolved
    #   3: lon,lat
    #   4: place_id
    #   5: place_str
    #   6: in_reply_to_status_id
    #   7: in_reply_to_screen_name
    #   8: retweet_id id of the original tweet
    #   9: retweet_count
    #  10: user.screen_name
    #  11: user.id
    #  12: user.created_at parsed into YYYYMMDDTHHMMSS
    #  13: user.name
    #  14: user.description
    #  15: user.location
    #  16: user.url
    #  17: user.statuses_count
    #  18: user.followers_count
    #  19: user.friends_count
    #  20: user.favourites_count
    #  21: user.geo_enabled
    #  22: user.default_profile
    #  23: user.time_zone
    #  24: user.lang
    #  25: user.utc_offset

    @classmethod
    def from_dict(cls, d):
        created_at = cls.date_to_compact(cls.parse_js_date(d['created_at']))

        text = d['text'].translate(cls.translations)
        for url in d['entities']['urls']:
            text = text.replace(url['url'], url['expanded_url'] or url['url'])
        for url in d['entities'].get('media', []):
            text = text.replace(url['url'], url['media_url'] or url['url'])
        text = text.\
            replace('&amp;', '&').replace('&quot;', '"').replace('&apos;', "'").\
            replace('&gt;', '>').replace('&lt;', '<')

        coords = '%.8f,%.8f' % tuple(d['coordinates']['coordinates']) if d['coordinates'] else ''
        place_id = ''
        place_str = ''
        if d['place']:
            place_id = d['place']['id']
            if d['place']['full_name'] == d['place']['country']:
                place_str = d['place']['full_name']
            else:
                place_str = '%s; %s' % (d['place']['full_name'], d['place']['country'])

        retweet_id = d['retweeted_status']['id_str'] if 'retweeted_status' in d and d['retweeted_status'] else ''

        user = d.get('user', {})
        user_created_at = cls.date_to_compact(cls.parse_js_date(user['created_at'])) if 'created_at' in user else ''
        return cls((
            d['id_str'],
            created_at,
            text,
            coords,
            place_id,
            place_str,
            d['in_reply_to_status_id_str'] or u'',
            d['in_reply_to_screen_name'] or u'',
            retweet_id,
            unicode(d.get('retweet_count', '')),
            user.get('screen_name', ''),
            user.get('id_str', ''),
            user_created_at,
            user.get('name', u'').translate(cls.translations),
            (user.get('description') or u'').translate(cls.translations),
            (user.get('location') or u'').translate(cls.translations),
            (user.get('url') or u'').translate(cls.translations),
            unicode(user.get('statuses_count', 0)),
            unicode(user.get('followers_count', 0)),
            unicode(user.get('friends_count', 0)),
            unicode(user.get('favourites_count', 0)),
            u'T' if user.get('geo_enabled', False) else u'F',
            u'T' if user.get('default_profile', False) else u'F',
            user.get('time_zone') or u'',
            user.get('lang') or u'',
            unicode(user.get('utc_offset') or '')
        ))
