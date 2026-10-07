#!/usr/bin/env python3
"""Convert a 6 Oct design reference (.dc.html) into a repo page (src/pages/...).

  venv/bin/python convert.py "<ref name without .dc.html>" [--write]

Mechanical part only; per-page interactivity (DCLogic) is ported by hand into /assets/js/pages/<slug>.js.
"""
import json, os, re, sys, urllib.parse
from bs4 import BeautifulSoup, NavigableString

HERE = os.path.dirname(os.path.abspath(__file__))
H = os.path.join(HERE, 'h1006/design_handoff_portfolio/')
REPO = os.path.dirname(HERE) + '/'
IMGMAP = json.load(open(os.path.join(HERE, 'imgmap.json')))

ROUTES = {
    'Portfolio Home.dc.html': '/', 'Work Index.dc.html': '/work/', 'About - Evidence.dc.html': '/about/',
    'Contact.dc.html': '/contact/', 'Illustration.dc.html': '/illustration/',
    'Case Study - LEGO ALMA.dc.html': '/work/lego-alma/', 'Case Study - Smart Fishing.dc.html': '/work/smart-fishing/',
    'Case Study - Octotorg.dc.html': '/work/octotorg/', 'Case Study - TrailMate.dc.html': '/work/trailmate/',
    'Case Study - An Honest Interface.dc.html': '/work/an-honest-interface/', 'Case Study - PlayRent.dc.html': '/work/playrent/',
    'Case Study - Resource Booking.dc.html': '/work/resource-booking/', 'Case Study - Gilded Cage.dc.html': '/work/gilded-cage/',
    'Case Study - Color Rotation.dc.html': '/work/color-rotation/', 'Case Study - Touch & Discover.dc.html': '/work/touch-and-discover/',
    'Case Study - Signalling Helmet.dc.html': '/work/signalling-helmet/', 'Case Study - Hello Heart.dc.html': '/work/hello-heart/',
    'Case Study - Rel-AI-tionship.dc.html': '/work/rel-ai-tionship/',
}
PAGE_FILE = {v: ('src/pages' + v + 'index.html') for v in ROUTES.values()}
PROTECTED_DOCS = ('files/', 'documents/', 'uploads/Touch_Discover_report.pdf', 'Tarek Alfutih - CV.pdf')

warnings = []


def captured(name, key):
    """Markup the reference page renders from React.createElement (decorative SVGs), captured from
    the live reference with cdp.py into <name>.json."""
    try: return json.load(open(os.path.join(HERE, name + '.json')))[key]
    except Exception: warnings.append('missing capture %s.%s' % (name, key)); return ''


# Template placeholders filled with static markup (their DCLogic only rendered a fixed element).
FILL = {
    'Case Study - PlayRent': {'{{ logoNotes }}': captured('pr-capture', 'logo'), '{{ prInst }}': captured('pr-capture', 'inst')},
    'Case Study - LEGO ALMA': {'{{ obsHot }}': ''},
    'Case Study - Octotorg': {'{{ ocGlow }}': '<div class="oc-glow" aria-hidden="true" style="position:absolute;left:44%;top:22%;width:50%;height:70%;border-radius:50%;filter:blur(90px);pointer-events:none;animation:ocHue 12s ease-in-out infinite"></div>'},
}


def style_dict(s):
    d = []
    for part in (s or '').split(';'):
        if ':' in part:
            k, v = part.split(':', 1)
            d.append([k.strip().lower(), v.strip()])
    return d


def style_str(d):
    return ';'.join('%s:%s' % (k, v) for k, v in d if k)


def sget(d, k):
    for kk, v in d:
        if kk == k: return v
    return None


def sdel(d, *keys):
    return [[k, v] for k, v in d if k not in keys]


def sset(d, k, v):
    d = sdel(d, k); d.append([k, v]); return d


def clean_path(p):
    p = urllib.parse.unquote(p.strip())
    return p[2:] if p.startswith('./') else p


SLOTS = json.load(open(H + 'image-slots.manifest.json'))


def adopt_image(q):
    """An image the repo doesn't have yet: reuse an identical repo file or copy the original in."""
    import hashlib, shutil
    src = H + q
    if not os.path.exists(src): return None
    h = hashlib.sha1(open(src, 'rb').read()).hexdigest()
    d = REPO + 'public/assets/img/'
    for f in os.listdir(d):
        if os.path.isfile(d + f) and hashlib.sha1(open(d + f, 'rb').read()).hexdigest() == h:
            IMGMAP[q] = f; break
    else:
        b, e = os.path.splitext(os.path.basename(q))
        name = re.sub(r'[^a-z0-9]+', '-', b.lower()).strip('-') + e.lower()
        if os.path.exists(d + name): name = os.path.splitext(name)[0] + '-orig' + e.lower()
        shutil.copyfile(src, d + name); IMGMAP[q] = name
    json.dump(IMGMAP, open(os.path.join(HERE, 'imgmap.json'), 'w'), indent=0)
    warnings.append('adopted image %s -> %s' % (q, IMGMAP[q]))
    return IMGMAP[q]


def map_asset(p):
    """Design asset path -> site URL (images to /assets/img/, protected docs keep their original path)."""
    q = clean_path(p)
    if q in IMGMAP: return '/assets/img/' + IMGMAP[q]
    if re.search(r'\.(png|jpe?g|gif|webp|avif|svg)$', q, re.I) and adopt_image(q): return '/assets/img/' + IMGMAP[q]
    if q.startswith(PROTECTED_DOCS) or q == 'Tarek Alfutih - CV.pdf':
        return '/' + urllib.parse.quote(q)
    return None


def map_href(h):
    if not h or h.startswith(('#', 'http', 'mailto:', 'tel:', '{{', 'javascript:')): return h
    base, _, frag = h.partition('#')
    base, _, query = base.partition('?')
    b = clean_path(base)
    if b in ROUTES:
        out = ROUTES[b] + ('?' + query if query else '') + ('#' + frag if frag else '')
        return out
    a = map_asset(b)
    if a: return a + ('#' + frag if frag else '')
    warnings.append('unmapped href: ' + h)
    return h


def map_urls_in_css(css):
    def rep(m):
        q, path = m.group(1), m.group(2)
        a = map_asset(path.replace('&quot;', ''))
        if not a:
            warnings.append('unmapped url(): ' + path); return m.group(0)
        return 'url(%s)' % a
    return re.sub(r'url\((&quot;|["\']?)((?:\./)?(?:images|uploads)/[^)"\'&]+|[^)"\'/&]+\.(?:png|jpe?g|gif|webp))\1?\)', rep, css)


def fix_attr_selectors(css):
    """The design tool matches inline styles as the browser serialises them ("display: flex",
    "rgb(74, 71, 68)"); the pages keep the authored form ("display:flex", "#4a4744")."""
    def hexc(m): return '#%02x%02x%02x' % tuple(int(x) for x in m.groups())
    def rep(m):
        v = m.group(1)
        v = re.sub(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', hexc, v)
        v = re.sub(r'^([a-z-]+): ', r'\1:', v)
        return '[style*="%s"]' % v
    return re.sub(r'\[style\*="([^"]*)"\]', rep, css)


def repo_videos(route):
    t = open(REPO + PAGE_FILE[route]).read()
    out = []
    for m in re.finditer(r'<video\b[^>]*>(\s*<source\b[^>]*>)*', t):
        tag = m.group(0)
        src = re.search(r'\bsrc="([^"]*)"', tag); poster = re.search(r'\bposter="([^"]*)"', tag)
        out.append((src.group(1) if src else None, poster.group(1) if poster else None))
    return out


VIDEO_NAME = {  # design file -> repo file (repo videos are the real sources; never swapped)
    'images/alma-final-outcome.mp4': '/assets/video/alma-final-outcome.mp4',
    'images/alma-idle-loop.mp4': '/assets/video/alma-idle-loop.mp4',
    'images/rb-hifi-walkthrough.mp4': '/assets/video/rb-hifi-walkthrough.mp4',
    'images/rb-lofi-walkthrough.mp4': '/assets/video/rb-lofi-walkthrough.mp4',
    'images/trailmate-hero.mp4': '/assets/video/trailmate-hero.mp4',
    'uploads/Ingemar Project my creation small size.mp4': '/assets/video/ingemar-project-my-creation-small-size.mp4',
    'uploads/Relaitionship small size file.mp4': '/assets/video/relaitionship-small-size-file.mp4',
    'uploads/short video for the game-9aff788b.mp4': '/assets/video/gilded-cage-gameplay.mp4',
    'uploads/smart fishing - videp prototype_short.mp4': '/assets/video/smart-fishing-figma-prototype.mp4',
    'images/playrent-demo.mp4': '/assets/video/playrent-demo.mp4',
}


def grid_area(el):
    """grid-column + grid-row -> grid-area, as the browser serialises them in the design tool, so
    the references' [style*="grid-column"] rules match the same elements."""
    st = style_dict(el.get('style'))
    gc, gr = sget(st, 'grid-column'), sget(st, 'grid-row')
    if not gc or not gr: return
    c = [x.strip() for x in gc.split('/')]; r = [x.strip() for x in gr.split('/')]
    parts = [r[0], c[0]] + ([r[1] if len(r) > 1 else 'auto', c[1]] if len(c) > 1 else ([r[1]] if len(r) > 1 else []))
    st = sdel(st, 'grid-column', 'grid-row'); st.append(['grid-area', ' / '.join(parts)])
    el['style'] = style_str(st)


def natural_img(img):
    """No crop, no bands: the image keeps its own shape and the frame around it follows."""
    st = style_dict(img.get('style'))
    pos = sget(st, 'position')
    fit = sget(st, 'object-fit')
    if pos == 'absolute' and fit != 'cover':
        return  # decorative / hero art positioned in a stage (transparent PNGs): leave
    if fit in ('cover', 'contain') or sget(st, 'height') in ('100%',) or sget(st, 'aspect-ratio'):
        st = sdel(st, 'height', 'aspect-ratio', 'object-fit', 'object-position', 'max-height')
        if pos == 'absolute':
            st = sdel(st, 'position', 'inset', 'top', 'left', 'right', 'bottom')
        if not sget(st, 'width'): st.append(['width', '100%'])
        st += [['height', 'auto']]
        if not sget(st, 'display'): st.append(['display', 'block'])
        img['style'] = style_str(st)
        # frames up the tree (wrapper link, sized box): drop fixed shape
        p = img.parent
        for _ in range(2):
            if p is None or p.name not in ('div', 'a', 'figure', 'picture', 'span'): break
            ps = style_dict(p.get('style'))
            if sget(ps, 'aspect-ratio') or sget(ps, 'height') not in (None, 'auto'):
                ps = sdel(ps, 'aspect-ratio', 'height', 'max-height', 'overflow')
                p['style'] = style_str(ps)
                img['data-frame'] = '1'
            if p.name != 'a': break
            p = p.parent


def tok(s):
    m = re.fullmatch(r'\{\{\s*([\w.]+)\s*\}\}', (s or '').strip())
    return m.group(1) if m else None


def carousels(soup, wrap, js=''):
    """Template carousels (DCLogic) -> static markup with data-car-* hooks for /assets/js/carousel.js."""
    for track in wrap.find_all(attrs={'ref': True}):
        name = tok(track['ref'])
        if not name or not name.endswith('Ref'): continue
        p = name[:-3]
        others = [x for x in wrap.find_all(True) if any(tok(v) in (p + 'Prev', p + 'Next', p + 'Dots', p + 'Toggle', p + 'Count') for k, v in x.attrs.items() if isinstance(v, str)) or (x.string and tok(x.string) == p + 'Count')]
        if not others:
            continue  # a plain element ref (hero, facts...), not a carousel
        root = track.parent
        while root is not None and not all(root in o.parents for o in others):
            root = root.parent
        if root is None: continue
        root['data-car'] = p
        um = re.search(r"%sCount:\s*'([A-Za-z]+) '" % p, js) or re.search(r"%sCount:[^,]*?'([A-Z][a-z]+) '" % p, js)
        if not um:
            um = re.search(r"_car\('%s', \d+, '([A-Za-z]+)'\)" % p, js)
        if not um:
            di = js.find(p + 'Dots')
            um = re.search(r"label: '([A-Za-z]+) ' \+", js[di:di + 800]) if di >= 0 else None
        if um: root['data-car-unit'] = um.group(1)
        for k in ('ref', 'onscroll', 'onkeydown'):
            if k in track.attrs: del track[k]
        track['data-car-track'] = ''
        for el in root.find_all(True):
            for k, v in list(el.attrs.items()):
                if not isinstance(v, str): continue
                n = tok(v)
                if not n: continue
                if k == 'onclick' and n == p + 'Prev': el['data-car-prev'] = ''; del el[k]
                elif k == 'onclick' and n == p + 'Next': el['data-car-next'] = ''; del el[k]
                elif k == 'onclick' and n == p + 'Toggle': el['data-car-toggle'] = ''; del el[k]
                elif k == 'aria-label' and n == p + 'PlayLabel': el[k] = 'Pause slideshow'
                elif k == 'disabled': del el[k]
        for s in root.find_all(string=True):
            if tok(s) == p + 'Count':
                s.parent['data-car-count'] = ''; s.replace_with('')
        for sc in root.find_all('sc-if'):
            n = tok(sc.get('value'))
            if n in (p + 'Playing', p + 'Paused'):
                span = soup.new_tag('span'); span['data-car-when'] = 'playing' if n.endswith('Playing') else 'paused'
                span['style'] = 'display:contents'
                for c in list(sc.contents): span.append(c.extract())
                if n.endswith('Paused'): span['hidden'] = ''
                sc.replace_with(span)
        for sf in root.find_all('sc-for'):
            if tok(sf.get('list')) != p + 'Dots': continue
            btn = sf.find(True)
            for sc in btn.find_all('sc-if'):
                inner = sc.find(True); inner['data-car-fill'] = ''
                for k in ('onanimationend',):
                    if k in inner.attrs: del inner[k]
                sc.replace_with(inner)
            if 'onclick' in btn.attrs: del btn['onclick']
            html = str(btn)
            html = re.sub(r'\{\{\s*d\.(\w+)\s*\}\}', lambda m: '%' + m.group(1) + '%', html)
            sf.parent['data-car-dots'] = ''
            tpl = soup.new_tag('template'); tpl['data-car-dot'] = ''
            tpl.append(BeautifulSoup(html, 'html.parser'))
            sf.replace_with(tpl)


def rb_schedule():
    """Resource Booking hero: the booking grid, static (final state: 16-19 selected in Svea 221).
    pages/resource-booking.js animates the selection (cells marked data-rb-h)."""
    hrs = list(range(8, 21))
    busy = {'Svea 200': [8, 9, 10, 11, 14, 16], 'Svea 221': [8, 9, 10, 11], 'Svea 119': [8, 9], 'Kuggen 104': [10, 11, 15, 16]}
    hatch = 'repeating-linear-gradient(135deg,rgba(255,255,255,.10) 0 3px,rgba(255,255,255,.04) 3px 6px)'
    out = []
    for name, b in busy.items():
        out.append('<span style="display:flex;align-items:center;font:500 11px/1 Archivo;color:#9fd6cf">%s</span>' % name)
        for h in hrs:
            sel = name == 'Svea 221' and 16 <= h < 19
            bg = '#e61fbf' if sel else (hatch if h in b else 'rgba(98,169,174,.45)')
            mark = ' data-rb-h="%d"' % h if name == 'Svea 221' and 16 <= h < 19 else ''
            out.append('<span%s style="height:22px;background:%s;transition:background .6s"></span>' % (mark, bg))
    return '\n'.join(out)


PRE = {  # raw-markup replacements before parsing (template loops rendered statically)
    'Case Study - Resource Booking': [(re.compile(r'<sc-for list="\{\{ sched \}\}".*?</sc-for>\s*</sc-for>', re.S), rb_schedule)],
}


def convert(ref, slug_route):
    t = open(H + ref + '.dc.html').read()
    helmet = t[t.find('<helmet>'):t.find('</helmet>')]
    css = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', helmet, re.S))
    css = map_urls_in_css(css)
    css = fix_attr_selectors(css)
    # image slots become <img>: CSS that targets the slot element targets the image instead
    css = re.sub(r'(?<![\w-])image-slot(?![\w-])', 'img', css)
    body = t[t.find('</helmet>') + 9:t.find('</x-dc>')]
    for rx, fn in PRE.get(ref, []):
        body, n = rx.subn(lambda m: fn(), body)
        if not n: warnings.append('PRE pattern not found')
    soup = BeautifulSoup(body, 'html.parser')
    wrap = soup.find('div', class_='wrap')
    header = wrap.find('header')
    tabs = header.find('nav', class_='cs-tabs') if header else None
    hover_css = []
    # style-hover -> class + CSS
    for n, el in enumerate(wrap.find_all(attrs={'style-hover': True})):
        cls = 'hvx%d' % n
        el['class'] = (el.get('class') or []) + [cls]
        decl = ';'.join('%s:%s !important' % (k, v) for k, v in style_dict(el['style-hover']))
        hover_css.append('.%s:hover{%s}' % (cls, decl))
        del el['style-hover']
    # image slots -> img
    for slot in wrap.find_all('image-slot'):
        src = slot.get('src') or (SLOTS.get(slot.get('id'), {}) or {}).get('image')
        url = map_asset(src) if src else None
        if not url:
            warnings.append('image-slot without image: %s' % slot.get('id')); url = ''
        img = soup.new_tag('img', src=url, alt=slot.get('placeholder', ''))
        st = style_dict(slot.get('style'))
        st = sdel(st, 'aspect-ratio', 'height')
        st = sset(st, 'width', '100%'); st = sset(st, 'height', 'auto'); st = sset(st, 'display', 'block')
        img['style'] = style_str(st)
        img['loading'] = 'lazy'; img['decoding'] = 'async'
        slot.replace_with(img)
        p = img.parent
        for _ in range(2):
            if p is None or p.name not in ('div', 'a', 'figure', 'span'): break
            ps = style_dict(p.get('style'))
            if sget(ps, 'aspect-ratio') or sget(ps, 'height') not in (None, 'auto'):
                p['style'] = style_str(sdel(ps, 'aspect-ratio', 'height', 'max-height', 'overflow'))
            if p.name != 'a': break
            p = p.parent
    # images
    for img in wrap.find_all('img'):
        if img.get('src') and not img['src'].startswith('/'):
            u = map_asset(img['src'])
            if u: img['src'] = u
            else: warnings.append('unmapped img: ' + img['src'])
        natural_img(img)
    # videos: repo src/poster, never the design's
    rv = repo_videos(slug_route); vi = 0
    for v in wrap.find_all('video'):
        dsrc = v.get('src') or (v.find('source') and v.find('source').get('src')) or ''
        want = VIDEO_NAME.get(clean_path(dsrc))
        match = [x for x in rv if x[0] == want] if want else []
        if not match:
            match = [rv[vi]] if vi < len(rv) else []
            warnings.append('video by position: %s -> %s' % (dsrc, match[0][0] if match else None))
        vi += 1
        for s in v.find_all('source'): s.decompose()
        if 'onerror' in v.attrs: del v['onerror']
        if match:
            v['src'] = match[0][0]
            if match[0][1]: v['poster'] = match[0][1]
            elif 'poster' in v.attrs: del v['poster']
    # links
    for a in wrap.find_all(href=True):
        a['href'] = map_href(a['href'])
    # inline url()s
    for el in wrap.find_all(style=True):
        el['style'] = map_urls_in_css(el['style'])
    ci = t.find('class Component')
    for el in wrap.find_all(style=True): grid_area(el)
    carousels(soup, wrap, t[ci:t.find('</script>', ci)] if ci > 0 else '')
    # other element refs (heroRef, factsRef...) -> data-ref="hero" for the page script
    for el in wrap.find_all(attrs={'ref': True}):
        n = tok(el['ref'])
        if n:
            el['data-ref'] = n[:-3] if n.endswith('Ref') else n; del el['ref']
    # page-specific template placeholders
    for k, v in FILL.get(ref, {}).items():
        for node in wrap.find_all(string=re.compile(re.escape(k))):
            node.replace_with(BeautifulSoup(node.replace(k, v), 'html.parser'))
        for el in wrap.find_all(True):
            for ak, av in list(el.attrs.items()):
                if isinstance(av, str) and k in av: el[ak] = av.replace(k, v)
    # header -> shared bar + section tabs
    hd = soup.new_tag('header'); hd['class'] = 'cs-hd'
    hd.append(NavigableString('\n    <!--@case-bar-->\n    '))
    if tabs:
        tabs['class'] = ['cs-nav', 'cs-tabs']; tabs['aria-label'] = 'Sections'
        hd.append(tabs)
    hd.append(NavigableString('\n  '))
    header.replace_with(hd)
    inner = wrap.decode_contents()
    # main element around the content after the header
    hpos = inner.find('</header>') + len('</header>')
    page = inner[:hpos] + '\n\n  <main id="main">\n' + inner[hpos:].rstrip() + '\n  </main>\n\n  <!--@footer-->\n'
    page = page.replace('&lt;!--@case-bar--&gt;', '<!--@case-bar-->')
    left = sorted(set(re.findall(r'\{\{[^}]*\}\}|<sc-(?:if|for)\b[^>]*>|onClick="[^"]*"|onclick="[^"]*"', page)))
    for l in left: warnings.append('TEMPLATE: ' + l[:120])
    return css + '\n' + '\n'.join(hover_css), page


def write(ref):
    route = ROUTES[ref + '.dc.html']
    path = REPO + PAGE_FILE[route]
    old = open(path).read()
    title = re.search(r'<title>.*?</title>', old, re.S).group(0)
    desc = re.search(r'<meta name="description"[^>]*>', old).group(0)
    css, page = convert(ref, route)
    slug = route.strip('/').split('/')[-1] or 'home'
    js = '/assets/js/pages/%s.js' % slug
    out = ('<!doctype html>\n<html lang="en">\n<head>\n<!--@head %s-->\n%s\n%s\n<style>\n%s\n</style>\n</head>\n<body>\n'
           '<a class="skip-link" href="#main">Skip to content</a>\n<div class="wrap">\n%s</div>\n<!--@scripts-->\n'
           '%s<script src="%s" defer></script>\n</body>\n</html>\n') % (route, title, desc, css.strip(), page,
           '<script src="/assets/js/carousel.js" defer></script>\n' if 'data-car=' in page else '', js)
    open(path, 'w').write(out)
    return path


if __name__ == '__main__':
    ref = sys.argv[1]
    if '--write' in sys.argv:
        print('wrote', write(ref))
    else:
        convert(ref, ROUTES[ref + '.dc.html'])
    for w in warnings: print('  !', w)
