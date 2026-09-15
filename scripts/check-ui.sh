#!/bin/sh
# UI gate for the spec (C4 tokens only, C5 house style). Exits 1 on the first violation.
set -e
fail() { echo "check-ui: $1"; exit 1; }
TSX=$(find src -name '*.tsx' 2>/dev/null)
if [ -n "$TSX" ]; then
  grep -HE '#[0-9a-fA-F]{3,8}\b' $TSX && fail "hex literal in a component" || true
  grep -HE 'bg-gradient|from-\w+-[0-9]+ to-' $TSX && fail "gradient class in a component" || true
  grep -HE '\b(zinc|slate|gray)-[0-9]{2,3}\b' $TSX && fail "untinted default palette class" || true
  python3 scripts/no_emoji.py $TSX || fail "emoji in a component"
fi
if [ -f src/copy.ts ]; then
  grep -H $'—' src/copy.ts && fail "em dash in copy" || true
  grep -H '!' src/copy.ts && fail "exclamation mark in copy" || true
  python3 scripts/no_emoji.py src/copy.ts || fail "emoji in copy"
fi
grep -q 'color-brand' src/styles/tokens.css || fail "brand token missing"
echo "check-ui: ok"
