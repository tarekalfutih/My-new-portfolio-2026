# tarekdesign.se

Portfolio site for Tarek Alfutih: plain static HTML, CSS and a little vanilla JS. No framework and no npm.
The build is one Python script with no dependencies. It expands the shared header, footer and head
partials, adds responsive image markup, then copies the static assets.

This folder is kept **outside** the design handoff folder on purpose: re-exporting from Claude Design
replaces `design_handoff_portfolio/` completely, so anything stored inside it is lost.

## Run locally

```bash
python3 build.py --serve
```

Open http://localhost:8000. Running `python3 build.py` on its own only writes `dist/`.

## Layout

```
build.py                 build + dev server (Python 3.8+, stdlib only)
tools/optimize_images.py responsive WebP variants (run when images change; needs Pillow)
tools/encode_video.swift re-encode a video to web H.264/AAC MP4 at a set size/bitrate (macOS)
tools/video_frame.swift  print video info + save the exact frame at a time (for posters)
src/pages/               one index.html per route (/, /work/, /work/lego-alma/, …)
src/partials/            head, header, case-study header bar, footer, scripts
src/image-manifest.json  WebP variants per image (written by tools/optimize_images.py)
src/image-sizes.json     measured display widths per page -> `sizes` attributes
public/                  copied to dist/ as-is
  cv.pdf
  CNAME                  tarekdesign.se (GitHub Pages custom domain)
  assets/css/modernist.css   design-system base (from the handoff's _ds/ folder)
  assets/css/base.css        tokens, page frame, header, footer, focus, shared motion, phone header + menu
  assets/css/case-phone.css  shared phone layer (< 768px) for the case studies that link it
  assets/js/site.js          scroll reveal + Claude Design image crops (every page)
  assets/js/video-controls.js  site video controls, no tint over the footage (every page)
  assets/js/video-behavior.js  pause off-screen, one video at a time, reset on back (every page)
  assets/js/cv-viewer.js      CV links open the CV in a dialog (pdf.js from assets/js/pdfjs/, every page)
  assets/js/pdfjs/           local copy of pdf.js 3.11.174 (Apache-2.0), loaded when the CV is opened
  assets/js/home.js, lego-alma.js, contact.js, work.js   page interactions
  assets/downloads/          downloadable builds (Gilded Cage macOS .dmg, 87 MB)
  assets/img|video|docs/     renamed assets (lowercase kebab-case); img/opt/ holds the WebP variants
tools/deploy_pages.sh    builds for GitHub Pages and publishes dist/ to the gh-pages branch
```

Pages use these include markers, which `build.py` expands:
`<!--@head /route/-->`, `<!--@header work-->` (marks the current page), `<!--@case-bar-->`,
`<!--@footer-->`, `<!--@footer email-->` and `<!--@scripts-->`.

Each page keeps its own `<style>` block with the layout values from its design reference. Put
system-wide changes in `base.css`. The build appends a content hash to CSS/JS URLs
(`site.js?v=…`), so browsers never run a stale copy after a change.

## Images

**Crops from Claude Design.** Images that were reframed in Claude Design carry
`data-view="scale offsetX offsetY"` (from the handoff's `image-slots.manifest.json`, keyed by slot
id). `site.js` reproduces the design tool's maths: the image fills the frame (object-fit cover or
contain), is scaled by `scale`, and its centre sits at `50% + offset%` of the frame. Like the tool, it
limits the pan to half the overflow, so the image always fills its frame.

**Responsive WebP.** `tools/optimize_images.py` (needs Pillow) writes resized WebP variants to
`public/assets/img/opt/` (480–2400px wide) and records them in `src/image-manifest.json`.
Animated GIFs become animated WebP when that is smaller. PNG sources (UI screenshots) are encoded
at quality 90, photos at 78: small interface text blurs at lower quality. At build time, `build.py` adds `srcset`
to each `<img>`, plus `sizes` from `src/image-sizes.json`: the measured display width of each image
per page at 375, 768, 1100 and 1440px. On a 2× desktop screen this cuts image weight from about
139 MB to about 13 MB across the site.

After adding or replacing an image, run `python3 tools/optimize_images.py` (unchanged images are
skipped). A new image without a measured size falls back to
`sizes="(max-width: 1280px) 100vw, 1280px"`. That is correct but can load a larger file than
needed, so add an entry to `image-sizes.json` if it matters.

## Videos

**Controls.** `assets/js/video-controls.js` replaces the browser's native controls on every
`<video controls>` with site controls: a compact bar at the bottom with play/pause, seek, time, sound and
full screen. It stays visible while paused and appears on hover, focus or tap while playing, with keyboard
support (Space/K, ←/→, M, F). Native controls were dropped because Safari tints the whole video
while they show, and pages can't turn that off. Without JavaScript the native controls remain.
Keep writing `controls` on new `<video>` tags and the script takes over.

**Rotate prompt.** `assets/js/video-behavior.js` shows a "Rotate your phone for full screen" card over a
landscape video when it starts playing on a phone or iPad held upright (once per video; hides after
3.6s, on rotation or on tap). It covers the whole video, control bar included. Test it on a desktop
with `?rotatetest=1` in the URL.

**Encoding.**

Owner-supplied recordings are often HEVC (Firefox and many Chrome setups can't play it) and far
larger than a page needs. Re-encode with macOS's built-in AVFoundation, no installs:

```bash
swift tools/encode_video.swift "in.mov" public/assets/video/name.mp4 480 1040 800000
swift tools/video_frame.swift "in.mov" 2 /tmp/frame.png   # poster frame at 0:02
```

Save the poster as WebP (same size as the video) next to it in `public/assets/video/` and add
`poster="…"` to the `<video>`. Smart Fishing uses: hero 720×1560 @ 2 Mbps (poster at 0:10),
Figma prototype 576×1248 @ 1.2 Mbps (poster at 0:01), working product 480×1040 @ 0.8 Mbps
(poster at 0:02). LEGO ALMA: final outcome 720×1280 @ 1.1 Mbps (poster at 0:01), idle loop 640×360 @ 0.55 Mbps (poster at 0:04).

## Case-study back link

Home links to case studies with `?from=home` and the Work index links with `?from=work`. With
`from=home`, the header shows "← Home" plus a Work link. Otherwise it shows "← All work" and hides
the Work link. The logic is the inline script in `src/partials/case-bar.html`.

## Deploying

The site is published with GitHub Pages from the `gh-pages` branch:

```bash
sh tools/deploy_pages.sh
```

This builds with `BASE_PATH=/My-new-portfolio-2026`, because the site lives at
https://tarekalfutih.github.io/My-new-portfolio-2026/. That prefixes every root-relative link,
image, video and CSS `url()` and leaves out `CNAME`. It then commits `dist/` to `gh-pages` and
pushes; only changed files are uploaded. Push your source changes to `main` as usual; `main`
holds the source and `gh-pages` holds the built site.

When **tarekdesign.se** points to GitHub Pages, edit `tools/deploy_pages.sh` so it uses an empty
`BASE_PATH` and `SITE_URL=https://tarekdesign.se`. The build then keeps `public/CNAME` and root URLs.
Also set the custom domain under the repo's Settings → Pages.

Netlify or Vercel (serving at a domain root): the build command is `python3 build.py`, and the
publish directory is `dist`.

## Known open items (waiting on the owner)

- Gilded Cage game (.dmg) is ad-hoc signed, not notarized, so macOS Gatekeeper blocks the first launch.
  Visitors must allow it in System Settings → Privacy & Security → "Open Anyway" (the page doesn't
  say so, to keep the design's layout). Signing and notarizing with an Apple Developer ID would
  remove that step. At 87 MB it's under GitHub's 100 MB file limit, but GitHub warns above 50 MB; a
  GitHub Release or itch.io is the alternative if the repo gets too heavy.

- PlayRent: 9 of 12 app screens were re-rendered sharp at 3× (1236×2751) from the vector
  screens in the Design & Developer Guidelines PDF. Annotation arrows were removed on two. On Log in,
  the PDF's "Username" label was replaced by "Email" and the logo moved to match the page's version.
  Create account and Search (category) are still 412px originals, because the PDF shows a different
  design version (an empty form, and a back arrow instead of ✕). A 3× export from Figma would fix
  them. Booked successfully is also a 412px original, but shown small enough to stay sharp.
- Video posters: done for Smart Fishing and LEGO ALMA; other case-study videos have none yet. Availability date not supplied.
- Videos outside Smart Fishing and LEGO ALMA are not recompressed yet (use tools/encode_video.swift). The largest is about 20 MB.
- `image-slots.manifest.json` has 14 entries whose slot ids no page uses, for example `alma-hero`
  (2.08× zoom), `home-portrait`, `a-portrait` and `rb-old-1`. They look left over from earlier
  design versions. The pages follow the exported HTML: the LEGO ALMA hero uses slot `alma-hero-2`
  with `images/alma-hero.jpg`.
