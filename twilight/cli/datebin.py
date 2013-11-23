from datetime import datetime


def main(parser):
    parser.add_argument('--unit', type=str, help='Use with --op bin')
    parser.add_argument('--count', type=float, help='Use with --op bin')

    val_func = lambda t: t.text_rtl_to_ltr()
    if opts.unit == 'm':
        # YYYYMMDD:HHMM = created_at[:13]
        key_func = lambda t: t.t.get('created_at')[:13]
    elif opts.unit == 'h':
        # YYYYMMDD:HH = created_at[:11]
        h = opts.count
        def key_func(t):
            dt = datetime.strptime(t.get('created_at'), '%Y%m%dT%H%M%S')
            hours = int((dt.hour + (dt.minute / 60.0))/h)*h + (h/2)
            return '%sT%02d0000' % (dt.strftime('%Y%m%d'), hours)
    elif opts.unit == 'd':
        # YYYYMMDD = created_at[:8]
        key_func = lambda t: t.get('created_at')[:8]

    binner = Binner(key_func, val_func)

    def mapper(line):
        tweet = TTV2.from_tsv(line)
        binner.add(tweet)

    map_stdin(mapper)
