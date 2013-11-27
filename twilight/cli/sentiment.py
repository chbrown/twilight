

def main(parser):
    # being lazy putting this import into this main()
    from lexicons import arabsenti, afinn, liwc

    # u"\"!.:;,/\\#+"
    strip = dict((ord(ch), u' ') for ch in u'!"#%\'()*+,-./:;<=>?@[\]^_`{|}~')

    def mapper(line):
        try:
            key, text = line.split(u'\t', 1)
            at_mentions = re.findall(r'@\w{4,}', text)
            tokens = text.lower().translate(strip).split()

            stderr('key: %s, %d chars, %d words' % (key, len(text), len(tokens)))

            sentiments = dict(finn=finn.tokens(tokens),
                arabsenti=arabsenti.tokens(tokens),
                liwc=liwc.tokens(tokens),
                wc=len(tokens),
                chars=len(text),
                at_mentions=len(at_mentions))

            stdout('%s\t%s' % (key, json.dumps(sentiments)))
        except:
            stderr('%s appears to have no key!' % line[:10000])

    map_stdin(mapper)

    # cat ~/Desktop/syria-snippet.keytext.gz | gunzip | cut -c -100000 | ./sa
    # cat ~/Desktop/syria-snippet.keytext.gz | gunzip | ./sa
    # | gzip > ~/Desktop/syria-snippet.keysenti.gz
