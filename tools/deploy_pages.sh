#!/bin/sh
# Build the site for GitHub Pages and publish it to the gh-pages branch.
#
#   sh tools/deploy_pages.sh
#
# The site is served at https://tarekdesign.se (custom domain on GitHub Pages), so it is built for
# the domain root: BASE_PATH is empty, root URLs are kept and public/CNAME is published.
# GitHub Pages serves the gh-pages branch as-is (.nojekyll turns Jekyll off).
#
# The commit is made from this repository's own object store, so images and videos that are
# already on GitHub (same files as on main) are not uploaded again: a deploy only sends what
# changed. No GitHub Actions workflow, so no `workflow` token scope is needed.
#
# To publish under https://tarekalfutih.github.io/My-new-portfolio-2026/ instead (no custom domain),
# set BASE_PATH="/$REPO_NAME" and SITE_URL="https://tarekalfutih.github.io/$REPO_NAME" below.
set -e
cd "$(dirname "$0")/.."

REPO_NAME=My-new-portfolio-2026
BASE_PATH=""
SITE_URL="https://tarekdesign.se"

BASE_PATH="$BASE_PATH" SITE_URL="$SITE_URL" python3 build.py
touch dist/.nojekyll

git fetch -q origin
GIT_DIR="$(git rev-parse --absolute-git-dir)"
INDEX="$GIT_DIR/gh-pages.index"
rm -f "$INDEX"
# Stage dist/ into a temporary index (not the normal one), skipping Finder litter.
( cd dist && GIT_INDEX_FILE="$INDEX" git --git-dir="$GIT_DIR" --work-tree=. add -A -- . ':(exclude)**/.DS_Store' )
TREE=$(GIT_INDEX_FILE="$INDEX" git --git-dir="$GIT_DIR" write-tree)
rm -f "$INDEX"

PARENT=$(git rev-parse -q --verify refs/remotes/origin/gh-pages || true)
if [ -n "$PARENT" ] && [ "$(git rev-parse "$PARENT^{tree}")" = "$TREE" ]; then
  echo "Nothing changed since the last deploy."
  exit 0
fi
MSG="Deploy site from main@$(git rev-parse --short HEAD)"
if [ -n "$PARENT" ]; then
  COMMIT=$(git commit-tree "$TREE" -p "$PARENT" -m "$MSG")
else
  COMMIT=$(git commit-tree "$TREE" -m "$MSG")
fi
git push origin "$COMMIT:refs/heads/gh-pages"
echo "Deployed $COMMIT → $SITE_URL/ (live in about a minute)"
