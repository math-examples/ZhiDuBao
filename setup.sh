#!/usr/bin/env bash
# setup.sh — Universal SRI + CDN updater for 指读宝
# Usage:
#   ./setup.sh                    # auto-detect owner/repo; content-hash version
#   ./setup.sh user repo          # specify owner + repo
#   ./setup.sh user repo v1.0.0   # specify owner + repo + version
set -euo pipefail

# ============ REPOSITORY ============
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "$REPO_ROOT" ]; then
  echo "❌ Not inside a git repo" >&2
  exit 1
fi
cd "$REPO_ROOT"

# --- Owner / repo resolution ---
if [ -n "${1:-}" ]; then
  OWNER="$1"
else
  OWNER="${GITHUB_OWNER:-$(git remote get-url origin 2>/dev/null \
    | sed -n 's|.*[:/]\([^/]*\)/\([^./]*\).*|\1|p' \
    | head -1)}"
  [ -n "$OWNER" ] || OWNER="$(basename "$(dirname "$REPO_ROOT")")"
fi

if [ -n "${2:-}" ]; then
  REPO="$2"
else
  REPO="${GITHUB_REPO:-$(basename "$REPO_ROOT")}"
fi

# --- Version resolution ---
if [ -n "${3:-}" ]; then
  VERSION="$3"
elif [ -n "${SRI_VERSION:-}" ]; then
  VERSION="$SRI_VERSION"
else
  HASH=""
  if [ -d css ] || [ -d js ]; then
    {
      [ -d css ] && find css -maxdepth 1 -type f -name '*.css' -print0 | sort -z | xargs -0 cat 2>/dev/null
      [ -d js ]  && find js  -maxdepth 1 -type f -name '*.js'  -print0 | sort -z | xargs -0 cat 2>/dev/null
    } | openssl dgst -sha256 2>/dev/null | awk '{print $NF}' | cut -c1-12 | tr -d '\n' && HASH=$(cat) || true
  fi
  if [ -n "$HASH" ]; then
    VERSION="$HASH"
  else
    VERSION="$(date -u +%Y%m%d%H%M%S)"
  fi
fi

[[ "$VERSION" =~ ^[vV] ]] || VERSION="v${VERSION}"

# --- Portable in-place sed ---
if [[ "${OSTYPE:-}" == darwin* ]]; then
  sedi() { sed -i '' "$@"; }
else
  sedi() { sed -i "$@"; }
fi

echo "🔐 Owner:   ${OWNER}"
echo "🔐 Repo:    ${REPO}"
echo "🔐 Version: ${VERSION}"

# ============ AUTO-DISCOVER ASSETS ============
ASSETS=()

if [ -d "css" ]; then
  while IFS= read -r -d '' f; do
    f="${f#./}"
    ASSETS+=("$f")
  done < <(find css -maxdepth 1 -type f -name '*.css' -print0 | sort -z)
fi

if [ -d "js" ]; then
  while IFS= read -r -d '' f; do
    f="${f#./}"
    ASSETS+=("$f")
  done < <(find js -maxdepth 1 -type f -name '*.js' -print0 | sort -z)
fi

if [ ${#ASSETS[@]} -eq 0 ]; then
  echo "⚠️  No CSS or JS assets found in css/ or js/" >&2
fi

echo "📦 Discovered ${#ASSETS[@]} asset(s): ${ASSETS[*]}"

# ============ SRI HASHES ============
declare -A SRI

for f in "${ASSETS[@]}"; do
  if [ -f "$f" ]; then
    hash=$(openssl dgst -sha384 -binary "$f" | openssl base64 -A)
    SRI[$f]="sha384-${hash}"
    echo "  ✅ ${f} → sha384-${hash:0:20}..."
  else
    SRI[$f]=""
    echo "  ⚠️  ${f} not found; skipping"
  fi
done

# --- loader.js (special case) ---
LOADER_SRI=""
if [ -f js/loader.js ]; then
  loader_hash=$(openssl dgst -sha384 -binary js/loader.js | openssl base64 -A)
  LOADER_SRI="sha384-${loader_hash}"
  echo "  ✅ js/loader.js → sha384-${loader_hash:0:20}..."
fi

if [ ! -f index.html ]; then
  echo "❌ index.html not found" >&2
  exit 1
fi

# ============ UPDATE index.html ============
cp index.html index.html.bak

# --- 1. Update __APP_CONFIG__ version ---
sedi "s#version: '[^\']*'#version: '${VERSION}'#g" index.html

# --- 2. Update owner/repo in base path ---
sedi "s#/gh/[a-zA-Z0-9_.-]*/[a-zA-Z0-9_.-]*@#/gh/${OWNER}/${REPO}@#g" index.html

# --- 3. Update version in all CDN URLs ---
sedi "s#@[vV]\?[0-9][^/]*/#@${VERSION}/#g" index.html
sedi "s#@[0-9]\{14,\}/#@${VERSION}/#g" index.html

# --- 4. Update integrity on <link> and <script> tags (by filename) ---
for f in "${ASSETS[@]}"; do
  sri="${SRI[$f]:-}"
  [ -n "$sri" ] || continue

  base=$(basename "$f")

  # 匹配包含该文件名的标签，替换 integrity
  sedi "/[a-z]*=\"[^\"]*${base}[^\"]*\"/ s#integrity=\"[^\"]*\"#integrity=\"${sri}\"#g" index.html
done

# --- 5. loader.js special handling ---
if [ -n "$LOADER_SRI" ]; then
  sedi "/loader\.js/ s#integrity=\"[^\"]*\"#integrity=\"${LOADER_SRI}\"#g" index.html
fi

# --- 6. Update sriHashes entries inside __APP_CONFIG__ ---
for f in "${ASSETS[@]}"; do
  sri="${SRI[$f]:-}"
  [ -n "$sri" ] || continue

  base=$(basename "$f")

  # 单引号 key
  sedi "/'${base}':/ s#'sha384-[^']*'#'${sri}'#g" index.html
  # 双引号 key
  sedi "/\"${base}\":/ s#\"sha384-[^\"]*\"#\"${sri}\"#g" index.html
done

# ============ DIFF SUMMARY ============
echo ""
echo "📝 Changes:"
echo "─────────────────────────────────────────────"
diff -u index.html.bak index.html \
  | grep '^[+-]' \
  | grep -v '^---\|^+++' \
  | head -60 || true
echo "─────────────────────────────────────────────"

rm -f index.html.bak

echo ""
echo "✅ index.html updated → ${OWNER}/${REPO}@${VERSION}"
echo ""
echo "SRI_OWNER=${OWNER}"
echo "SRI_REPO=${REPO}"
echo "SRI_VERSION=${VERSION}"