#!/usr/bin/env bash
# Post-deploy smoke test for milyidom.com
# Usage: ./smoke.sh [BASE_URL] [API_URL]
# Example: ./smoke.sh https://milyidom.com https://api.milyidom.com

set -euo pipefail

BASE_URL="${1:-https://milyidom.com}"
API_URL="${2:-https://api.milyidom.com}"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local name="$1"
  local expected_status="$2"
  local actual_status="$3"
  local body="${4:-}"

  if [ "$actual_status" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} $name (HTTP $actual_status)"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ FAIL${NC} $name — expected $expected_status, got $actual_status"
    [ -n "$body" ] && echo "   Response: ${body:0:200}"
    FAIL=$((FAIL + 1))
  fi
}

check_contains() {
  local name="$1"
  local body="$2"
  local expected="$3"

  if echo "$body" | grep -q "$expected"; then
    echo -e "${GREEN}✅ PASS${NC} $name (contains '$expected')"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ FAIL${NC} $name — expected to contain '$expected'"
    echo "   Got: ${body:0:200}"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "═══════════════════════════════════════════════"
echo "  Milyi Dom — Post-Deploy Smoke Test"
echo "  BASE: $BASE_URL"
echo "  API:  $API_URL"
echo "═══════════════════════════════════════════════"
echo ""

# ── 1. Public API endpoints ──────────────────────────────────────────────────
echo -e "${YELLOW}[1/5] Public API endpoints${NC}"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health")
check "GET /api/health" "200" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/listings?limit=1")
check "GET /api/listings (public)" "200" "$STATUS"

LISTINGS_BODY=$(curl -s "$API_URL/api/listings?limit=1")
check_contains "Listings returns data array" "$LISTINGS_BODY" '"id"'

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api")
check "GET /api (root info)" "200" "$STATUS"

echo ""

# ── 2. Auth endpoints ────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/5] Authentication${NC}"

LOGIN_BODY=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"host@example.com","password":"password123"}')
LOGIN_STATUS=$(echo "$LOGIN_BODY" | grep -c '"accessToken"' || true)

if [ "$LOGIN_STATUS" -gt 0 ]; then
  echo -e "${GREEN}✅ PASS${NC} POST /api/auth/login (token received)"
  PASS=$((PASS + 1))
  ACCESS_TOKEN=$(echo "$LOGIN_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
else
  echo -e "${RED}❌ FAIL${NC} POST /api/auth/login — no token in response"
  echo "   Got: ${LOGIN_BODY:0:200}"
  FAIL=$((FAIL + 1))
  ACCESS_TOKEN=""
fi

if [ -n "$ACCESS_TOKEN" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/users/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  check "GET /api/users/me (authenticated)" "200" "$STATUS"
fi

# Auth guard check
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/users/me")
check "GET /api/users/me (no token → 401)" "401" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/admin/users")
check "GET /api/admin/users (no token → 401)" "401" "$STATUS"

echo ""

# ── 3. Newsletter endpoint ───────────────────────────────────────────────────
echo -e "${YELLOW}[3/5] Newsletter${NC}"

UNIQUE_EMAIL="smoke-$(date +%s)@example-smoke.com"
NL_BODY=$(curl -s -X POST "$API_URL/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\"}")
NL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"smoke-check-$(date +%s)2@example-smoke.com\"}")
check "POST /api/newsletter/subscribe" "200" "$NL_STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$UNIQUE_EMAIL\"}")
check "POST /api/newsletter/subscribe (duplicate → 409)" "409" "$STATUS"

echo ""

# ── 4. WebSocket reachability ────────────────────────────────────────────────
echo -e "${YELLOW}[4/5] WebSocket (polling check)${NC}"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API_URL/socket.io/?EIO=4&transport=polling")
check "GET /socket.io/ (polling handshake)" "200" "$STATUS"

echo ""

# ── 5. Frontend pages ────────────────────────────────────────────────────────
echo -e "${YELLOW}[5/5] Frontend pages${NC}"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
check "GET / (homepage)" "200" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/listings")
check "GET /listings (catalog)" "200" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auth/login")
check "GET /auth/login" "200" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auth/register")
check "GET /auth/register" "200" "$STATUS"

echo ""
echo "═══════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════"
echo ""

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
