# tarekdesign.se — interaction design portfolio

Only this site lives here. The illustration portfolio (tarekalfutih.se) is a separate repo:
`~/Documents/GitHub/illustration portfolio`.

- Edit `src/` (pages + partials) and `public/` (assets). `dist/` is build output; never edit it.
- Build: `.work/venv/bin/python build.py` · preview: launch config "site" (`build.py --serve`, port 8010).
- Deploy: commit + push `main`, then `sh tools/deploy_pages.sh`; wait for
  `gh api repos/tarekalfutih/My-new-portfolio-2026/pages/builds/latest` to say `built`.
- Shared illustration section: `src/partials/illustration.html` + `public/assets/css/illustration.css`.
  Skräphjältarna hero: `public/assets/css/skraphjaltarna-hero.css`.
- Never swap or re-encode video/image files unless asked; layout fixes are CSS/markup only.
- Use `↗︎` (with U+FE0E) for the ↗ arrow, or iPhone Safari draws an emoji.
- Last tested state: tag `tested-2026-10-28`.
- Some files are only named in JS: `octotorg.js` builds `octotorg-anim-2/3.png` from frame 1. Grep `public/assets/js` before calling an asset unused.
