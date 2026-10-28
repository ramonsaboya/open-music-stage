#!/usr/bin/env bash
# Usage: tools/shot.sh "<url path+query, e.g. harness.html?m=flx10&cam=0,900,0.1>" out.png [WxH]
# Needs the static server on 127.0.0.1:8765 (python -m http.server 8765 --bind 127.0.0.1, run from the project root).
URL="http://127.0.0.1:8765/$1"; OUT="$2"; SIZE="${3:-1600,1000}"
case "$OUT" in /*|?:*) ;; *) OUT="$(pwd)/$OUT";; esac
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
PROFILE="$(mktemp -d)"
"$CH" --headless=new --disable-gpu-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --user-data-dir="$PROFILE" --window-size="$SIZE" --virtual-time-budget=15000 --run-all-compositor-stages-before-draw \
  --screenshot="$(cygpath -w "$OUT")" "$URL" >/dev/null 2>&1
rm -rf "$PROFILE"
[ -f "$OUT" ] && echo "saved $OUT" || echo "FAILED"
