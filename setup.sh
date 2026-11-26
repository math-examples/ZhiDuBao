#!/usr/bin/env bash
# setup.sh — Refined SRI + CDN updater for 指读宝 (CI‑safe)
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

# ============ VERSION RESOLUTION ============
if [ -n "${3:-}" ]; then
  VERSION="$3"
elif [ -n "${SRI_VERSION:-}" ]; then
  VERSION="$SRI_VERSION"
else
  # Safe file list construction (no xargs, no hanging)
  FILE_LIST=()
  if [ -d css ]; then
    while IFS= read -r -d '' f; do
      FILE_LIST+=("$f")
    done < <(find css -maxdepth 1 -type f -name '*.css' -print0 | sort -z)
  fi
  if [ -d js ]; then
    while IFS= read -r -d '' f; do
      FILE_LIST+=("$f")
    done < <(find js -maxdepth 1 -type f -name '*.js' -print0 | sort -z)
  fi

  if [ ${#FILE_LIST[@]} -gt 0 ]; then
    HASH=$(cat "${FILE_LIST[@]}" 2>/dev/null \
      | openssl dgst -sha256 2>/dev/null \
      | awk '{print $NF}' \
      | cut -c1-12)
  else
    HASH=""
  fi

  if [ -n "$HASH" ]; then
    VERSION="$HASH"
  else
    VERSION="$(date -u +%Y%m%d%H%M%S)"
  fi
fi

[[ "$VERSION" =~ ^[vV] ]] || VERSION="v${VERSION}"

# --- Portable in‑place sed ---
if [[ "${OSTYPE:-}" == darwin* ]]; then
  sedi() { sed -i '' "$@"; }
else
  sedi() { sed -i "$@"; }
fi

echo "🔐 Owner:   ${OWNER}"
echo "🔐 Repo:    ${REPO}"
echo "🔐 Version: ${VERSION}"

# ============ DISCOVER ASSETS (for later updates) ============
ASSETS=()
if [ -d css ]; then
  while IFS= read -r -d '' f; do
    ASSETS+=("${f#./}")
  done < <(find css -maxdepth 1 -type f -name '*.css' -print0 | sort -z)
fi
if [ -d js ]; then
  while IFS= read -r -d '' f; do
    ASSETS+=("${f#./}")
  done < <(find js -maxdepth 1 -type f -name '*.js' -print0 | sort -z)
fi

# ============ GENERATE SRI HASHES ============
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

if [ ! -f index.html ]; then
  echo "❌ index.html not found" >&2
  exit 1
fi

# ============ UPDATE index.html ============
cp index.html index.html.bak

# 1. App config version
sedi "s|version: '[^']*'|version: '${VERSION}'|g" index.html

# 2. CDN base path
sedi "s|/gh/[a-zA-Z0-9_.-]*/[a-zA-Z0-9_.-]*@|/gh/${OWNER}/${REPO}@|g" index.html

# 3. Version in URLs
sedi "s|@[v]*[0-9][^/]*/|@${VERSION}/|g" index.html

# 4. Integrity attributes (multi‑line ranges, like the demo)
for f in "${ASSETS[@]}"; do
  sri="${SRI[$f]:-}"
  [ -n "$sri" ] || continue

  if [[ "$f" == css/* ]]; then
    sedi "/<link rel=\"stylesheet\"/,/crossorigin=/ s|integrity=\"[^\"]*\"|integrity=\"${sri}\"|" index.html
  elif [[ "$f" == js/* ]]; then
    fname=$(basename "$f")
    sedi "/<script[^>]*${fname}/,/crossorigin=/ s|integrity=\"[^\"]*\"|integrity=\"${sri}\"|" index.html
  fi
done

# 5. sriHashes inside __APP_CONFIG__
for f in "${ASSETS[@]}"; do
  sri="${SRI[$f]:-}"
  [ -n "$sri" ] || continue
  fname=$(basename "$f")
  sedi "/'${fname}':/ s|'sha384-[^']*'|'${sri}'|g" index.html
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