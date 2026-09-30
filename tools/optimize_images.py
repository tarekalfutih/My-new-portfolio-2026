#!/usr/bin/env python3
"""Generate responsive WebP variants for everything in public/assets/img/.

    python3 tools/optimize_images.py

Writes public/assets/img/opt/<name>-<width>.webp and src/image-manifest.json. PNG sources
(screenshots) use quality 90, photos 78. After changing a quality setting, delete the matching
opt/ files so they are regenerated. Images that are
already up to date are skipped, so rerun it after adding or replacing an image. build.py reads
the manifest and adds srcset/sizes to each <img>. The original file stays as the src fallback.
Needs Pillow with WebP support (pip install pillow).
"""
import json
import os
import sys

from PIL import Image, ImageOps, ImageSequence

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'public', 'assets', 'img')
OPT = os.path.join(IMG, 'opt')
MANIFEST = os.path.join(ROOT, 'src', 'image-manifest.json')

WIDTHS = [480, 800, 1200, 1600, 2400]
QUALITY = 78        # photos (JPG etc.)
QUALITY_UI = 90     # PNG sources are UI screenshots/graphics: small text blurs at 78
RASTER = ('.jpg', '.jpeg', '.png', '.webp', '.avif')


def fresh(out, src):
    return os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(src)


def still(name, path):
    stem = os.path.splitext(name)[0]
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)
        w, h = im.size
        icc = im.info.get('icc_profile')
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGBA' if 'transparency' in im.info or im.mode in ('LA', 'P') else 'RGB')
        widths = [x for x in WIDTHS if x < w] + [min(w, WIDTHS[-1])]
        variants = []
        for tw in sorted(set(widths)):
            out = os.path.join(OPT, '%s-%d.webp' % (stem, tw))
            if not fresh(out, path):
                th = round(h * tw / w)
                q = QUALITY_UI if name.lower().endswith('.png') else QUALITY
                im.resize((tw, th), Image.LANCZOS).save(out, 'WEBP', quality=q, method=6,
                                                        **({'icc_profile': icc} if icc else {}))
            variants.append(['/assets/img/opt/' + os.path.basename(out), tw])
    return {'w': w, 'h': h, 'variants': variants}


def animated(name, path):
    """Animated GIF -> animated WebP at the same size; used only when it is smaller."""
    stem = os.path.splitext(name)[0]
    out = os.path.join(OPT, stem + '.webp')
    with Image.open(path) as im:
        w, h = im.size
        if not fresh(out, path):
            frames, durations = [], []
            for fr in ImageSequence.Iterator(im):
                frames.append(fr.convert('RGBA'))
                durations.append(fr.info.get('duration', 100))
            frames[0].save(out, 'WEBP', save_all=True, append_images=frames[1:], duration=durations,
                           loop=im.info.get('loop', 0), quality=QUALITY, method=4, minimize_size=True)
    if os.path.getsize(out) >= os.path.getsize(path):
        return None
    return {'w': w, 'h': h, 'replace': '/assets/img/opt/' + os.path.basename(out)}


def main():
    os.makedirs(OPT, exist_ok=True)
    manifest = {}
    names = sorted(n for n in os.listdir(IMG) if os.path.isfile(os.path.join(IMG, n)))
    for i, name in enumerate(names, 1):
        path = os.path.join(IMG, name)
        ext = os.path.splitext(name)[1].lower()
        try:
            if ext == '.gif':
                entry = animated(name, path)
            elif ext in RASTER:
                entry = still(name, path)
            else:
                continue
        except Exception as e:  # keep going; the original still works
            print('  skipped %s: %s' % (name, e), file=sys.stderr)
            continue
        if entry:
            manifest['/assets/img/' + name] = entry
        print('[%d/%d] %s' % (i, len(names), name), flush=True)
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
    print('manifest: %d images' % len(manifest))


if __name__ == '__main__':
    main()
