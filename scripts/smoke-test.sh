#!/usr/bin/env bash
#
# Smoke Test Script — Pre-Production Verification
# Runs lint, build, and key checks for web + functions
#
set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local label="$1"
  shift
  printf "  %-40s" "$label"
  if "$@" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}FAIL${NC}"
    ((FAIL++))
  fi
}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  The Brief — Pre-Production Smoke Tests      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Web ──
echo -e "${YELLOW}Web App${NC}"
check "npm install"                   npm install --silent
check "eslint (0 errors)"            npm run lint
check "TypeScript + Vite build"      npm run build
check "dist/index.html exists"       test -f dist/index.html
check "Main JS bundle exists"        ls dist/assets/index-*.js > /dev/null 2>&1
check "CSS bundle exists"            ls dist/assets/index-*.css > /dev/null 2>&1
check "No .env in dist"              test ! -f dist/.env
echo ""

# ── Functions ──
echo -e "${YELLOW}Cloud Functions${NC}"
check "functions npm install"        bash -c "cd functions && npm install --silent"
check "functions eslint"             bash -c "cd functions && npm run lint"
check "functions tsc build"          bash -c "cd functions && npm run build"
check "functions/lib/index.js exists" test -f functions/lib/index.js
echo ""

# ── iOS / Capacitor ──
echo -e "${YELLOW}iOS / Capacitor${NC}"
check "capacitor.config.ts exists"    test -f capacitor.config.ts
check "ios directory exists"          test -d ios/App
check "cap sync ios"                  npx cap sync ios
echo ""

# ── Config ──
echo -e "${YELLOW}Configuration${NC}"
check "firebase.json exists"          test -f firebase.json
check "firestore.rules exists"        test -f firestore.rules
check "firestore.indexes.json exists" test -f firestore.indexes.json
check "index.html has viewport-fit"   grep -q "viewport-fit=cover" index.html
check "theme-color is white"          grep -q 'content="#FFFFFF"' index.html
echo ""

# ── Summary ──
TOTAL=$((PASS + FAIL))
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Results: ${GREEN}${PASS} passed${NC} / ${RED}${FAIL} failed${NC} / ${TOTAL} total"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Some checks failed. Fix issues before deploying.${NC}"
  exit 1
else
  echo -e "${GREEN}All checks passed. Ready for deployment.${NC}"
  exit 0
fi
