#!/usr/bin/env python3
"""Static build for tarekdesign.se — no dependencies beyond Python 3.8+.

    python3 build.py            # build into dist/
    python3 build.py --serve    # build, then serve dist/ on http://localhost:8000

    BASE_PATH=/My-new-portfolio-2026 python3 build.py
                                # build for a sub-path (GitHub Pages without a custom domain):
                                # every root-relative URL gets the prefix and CNAME is left out

Pages live in src/pages/ (one index.html per route). They are plain HTML with a
few include markers that are expanded from src/partials/:

    <!--@head /route/-->          shared <head> tags (fonts, CSS, canonical URL)
    <!--@header work-->           site header; the argument marks the current page
    <!--@case-bar-->              first row of the case-study header
    <!--@footer--> / <!--@footer email-->
    <!--@scripts-->               shared scripts

Everything in public/ is copied to dist/ unchanged. <img> tags get WebP srcset/sizes from
src/image-manifest.json (tools/optimize_images.py) and src/image-sizes.json.
"""
import hashlib
import http.server
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
PUBLIC = os.path.join(ROOT, 'public')
DIST = os.path.join(ROOT, 'dist')
BASE_PATH = os.environ.get('BASE_PATH', '').rstrip('/')          # '' when served at a domain root
SITE_URL = os.environ.get('SITE_URL', 'https://tarekdesign.se').rstrip('/')  # canonical origin (+ base)

NAV = [('home', '/', 'Home'), ('work', '/work/', 'Work'), ('about', '/about/', 'About'), ('contact', '/contact/', 'Contact')]

# "← Back" on detail pages (case studies, Illustration): nav-back.js goes to the previous page on this
# site, otherwise follows href. On phones it is a chevron left of the name (base.css).
BACK = ('<a class="cs-back" href="%s" data-back aria-label="Back"><span class="cs-back-a" aria-hidden="true">←</span><svg class="cs-back-c" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="square" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg><span class="cs-back-t" aria-hidden="true">&nbsp;Back</span></a>')


def partial(name):
    with open(os.path.join(SRC, 'partials', name + '.html'), encoding='utf-8') as f:
        return f.read().strip()


def nav_links(current, row=False):
    """Home · Work · About · Contact; the current page is marked (Work on detail pages)."""
    out = []
    for key, href, label in NAV:
        cur = ' aria-current="page"' if key == current else (' aria-current="true"' if key == 'work' and current == 'detail' else '')
        out.append(('<a href="%s"%s>%s<span aria-hidden="true">→</span></a>' if row else '<a href="%s"%s>%s</a>') % (href, cur, label))
    return out


def header(current):
    # Illustration is a detail page: "← Back" (fallback Home) and Work marked in the nav.
    detail = current == 'illustration'
    key = 'detail' if detail else current
    back = '\n    ' + BACK % '/' + '\n    <script src="/assets/js/nav-back.js" defer></script>' if detail else ''
    return (partial('header').replace('{{nav}}', '\n      '.join(nav_links(key)))
            .replace('{{menu}}', '\n      '.join(nav_links(key, row=True))).replace('{{back}}', back))


def case_bar():
    return (partial('case-bar').replace('{{back}}', BACK % '/work/')
            .replace('{{nav}}', ''.join(nav_links('detail'))).replace('{{menu}}', '\n      '.join(nav_links('detail', row=True))))


def load_json(name):
    path = os.path.join(SRC, name)
    if not os.path.exists(path):
        return {}
    with open(path, encoding='utf-8') as f:
        return json.load(f)


IMAGES = load_json('image-manifest.json')   # written by tools/optimize_images.py
SIZES = load_json('image-sizes.json')       # measured rendered widths, per route
DEFAULT_SIZES = '(max-width: 1280px) 100vw, 1280px'


def responsive_images(text, route):
    """Point each <img> at its WebP variants: srcset + sizes, or a swapped src for animated GIFs.
    The original file stays as src, so nothing breaks if an image has not been optimised yet."""
    def repl(m):
        tag, src = m.group(0), m.group(1)
        entry = IMAGES.get(src)
        if not entry:
            return tag
        if entry.get('w') and not re.search(r'\swidth=', tag):
            # Intrinsic size: the browser reserves the image's own shape before it loads (no layout
            # shift; lazy images in carousels and grids get their box).
            tag = tag.replace('<img', '<img width="%d" height="%d"' % (entry['w'], entry['h']), 1)
        if 'srcset=' in tag:
            return tag
        if 'replace' in entry:
            return tag.replace('src="%s"' % src, 'src="%s"' % entry['replace'], 1)
        srcset = ', '.join('%s %dw' % (u, w) for u, w in entry['variants'])
        sizes = SIZES.get(route, {}).get(src, DEFAULT_SIZES)
        return tag.replace('src="%s"' % src, 'src="%s" srcset="%s" sizes="%s"' % (src, srcset, sizes), 1)
    return re.sub(r'<img\b[^>]*\bsrc="(/assets/img/[^"]+)"[^>]*>', repl, text)


def cache_bust(text):
    """Append a content hash to local CSS/JS/video URLs so browsers never use a stale copy after a change."""
    def repl(m):
        path = os.path.join(PUBLIC, m.group(1).lstrip('/'))
        if not os.path.isfile(path):
            return m.group(0)
        with open(path, 'rb') as f:
            digest = hashlib.md5(f.read()).hexdigest()[:8]
        return '"%s?v=%s"' % (m.group(1), digest)
    return re.sub(r'"(/assets/(?:css|js|video)/[^"?]+)"', repl, text)


def with_base(text):
    """Prefix root-relative URLs (href/src/poster, srcset entries, CSS url()) with BASE_PATH."""
    if not BASE_PATH:
        return text
    text = re.sub(r'\b(href|src|poster|action)="/(?!/)', r'\1="%s/' % BASE_PATH, text)
    text = re.sub(r'\bsrcset="([^"]*)"',
                  lambda m: 'srcset="%s"' % re.sub(r'(^|,\s*)/(?!/)', r'\1%s/' % BASE_PATH, m.group(1)), text)
    text = re.sub(r'url\((["\']?)/(?!/)', r'url(\1%s/' % BASE_PATH, text)
    return text


def render(text, route='/'):
    text = re.sub(r'<!--@head (\S+)-->',
                  lambda m: partial('head').replace('{{url}}', SITE_URL + m.group(1)), text)
    text = re.sub(r'<!--@header (\w+)-->', lambda m: header(m.group(1)), text)
    text = text.replace('<!--@case-bar-->', case_bar())
    text = text.replace('<!--@footer email-->', partial('footer').replace('class="ft"', 'class="ft ft-home"')
                        .replace('{{extra}}', '\n    ' + partial('footer-email')))
    text = text.replace('<!--@footer-->', partial('footer').replace('{{extra}}', ''))
    text = text.replace('<!--@scripts-->', partial('scripts'))
    text = responsive_images(text, route)
    text = cache_bust(text)
    text = with_base(text)
    left = re.findall(r'<!--@[^>]*-->', text)
    if left:
        raise SystemExit('Unknown include marker(s): %s' % left)
    return text


def build():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    shutil.copytree(PUBLIC, DIST)
    if BASE_PATH and os.path.exists(os.path.join(DIST, 'CNAME')):
        os.remove(os.path.join(DIST, 'CNAME'))   # custom domain only applies to a root build
    pages_dir = os.path.join(SRC, 'pages')
    count = 0
    for dirpath, _, files in os.walk(pages_dir):
        for name in files:
            if not name.endswith('.html'):
                continue
            src = os.path.join(dirpath, name)
            dest = os.path.join(DIST, os.path.relpath(src, pages_dir))
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            rel = os.path.relpath(dirpath, pages_dir)
            route = '/' if rel == '.' else '/%s/' % rel.replace(os.sep, '/')
            with open(src, encoding='utf-8') as f:
                out = render(f.read(), route)
            with open(dest, 'w', encoding='utf-8') as f:
                f.write(out)
            count += 1
    print('Built %d pages into %s%s' % (count, os.path.relpath(DIST, os.getcwd()),
                                        ' (base path %s)' % BASE_PATH if BASE_PATH else ''))


def serve(port=8000):
    os.chdir(DIST)
    handler = http.server.SimpleHTTPRequestHandler
    # Threaded: a video download (browsers keep that connection open) must not block every other file.
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(('', port), handler) as httpd:
        print('Serving dist/ at http://localhost:%d' % port)
        httpd.serve_forever()


if __name__ == '__main__':
    build()
    if '--serve' in sys.argv:
        serve(int(os.environ.get('PORT', 8000)))
