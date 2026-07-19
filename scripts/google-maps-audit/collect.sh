#!/usr/bin/env bash
# 구글맵 정류장 위치 감사 — 1단계: 검색 결과 DOM 수집
#
# 각 정류장의 기본 일본어명(괄호 속 방면 표기 제거) + " バス停 鹿児島"로 검색해
# 결과 페이지 DOM을 out/에 저장한다. 헤드리스 Chrome이 필요 (macOS 경로 고정,
# 다른 환경이면 CHROME 환경변수로 지정).
#
# 사용: scripts/google-maps-audit/collect.sh [routeId]   (기본 cityview)
# 출력: scripts/google-maps-audit/out/<stopId>.html, queries.txt
set -u
ROUTE_ID="${1:-cityview}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/out"
mkdir -p "$OUT"

python3 - "$ROUTE_ID" "$OUT/queries.txt" << 'PY'
import json, re, sys
route_id, out_path = sys.argv[1], sys.argv[2]
d = json.load(open(f'src/data/routes/{route_id}.json'))
with open(out_path, 'w') as f:
    for s in d['stops']:
        base = re.sub(r'（[^）]*）', '', s['name']['ja']).strip()
        f.write(s['id'] + '\t' + base + '\n')
print('queries:', len(d['stops']))
PY

while IFS=$'\t' read -r id ja; do
  Q=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$ja バス停 鹿児島")
  "$CHROME" --headless --disable-gpu --virtual-time-budget=9000 \
    --dump-dom "https://www.google.com/maps/search/$Q?hl=ja" > "$OUT/$id.html" 2>/dev/null
  echo "$id done ($(wc -c < "$OUT/$id.html") bytes)"
  sleep 3
done < "$OUT/queries.txt"
echo ALL_DONE
