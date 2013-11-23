

def is_arabic(text_unicode):
    '''
    Returns True if more than half the characters in unicode_text are Arabic-looking characters
    '''
    char_codes = map(ord, text_unicode)
    arabic_chars = [char_code for char_code in char_codes if 1536 <= char_code <= 1791]
    return len(arabic_chars) > (len(char_codes) / 2.0)


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
