#!/usr/bin/env bash
# 구글맵 정류장 위치 감사 — 1-B단계: 장소 페이지 좌표 수집 (CDP fallback)
#
# collect.sh 결과 DOM에 좌표가 없는 정류장(구글이 장소 페이지로 직행하는 경우)용.
# 헤드리스 Chrome을 디버그 포트로 띄워 탐색 완료 후의 최종 URL(…/place/이름/@위도,경도)을
# CDP /json 엔드포인트에서 읽어 out/places.jsonl에 기록한다.
#
# 사용: scripts/google-maps-audit/collect-place-pages.sh stop_10 stop_11 ...
set -u
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/out"
PROFILE="${CHROME_PROFILE:-/tmp/kcv-gmaps-audit-profile}"
PORT="${CDP_PORT:-9222}"

for id in "$@"; do
  base=$(grep "^$id" "$OUT/queries.txt" | cut -f2)
  if [ -z "$base" ]; then echo "$id: queries.txt에 없음 — collect.sh 먼저 실행"; continue; fi
  Q=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$base バス停 鹿児島")
  "$CHROME" --headless --disable-gpu --remote-debugging-port="$PORT" \
    --user-data-dir="$PROFILE" "https://www.google.com/maps/search/$Q?hl=ja" > /dev/null 2>&1 &
  CPID=$!
  sleep 12
  curl -s "http://localhost:$PORT/json" | python3 -c "
import json,sys,re,urllib.parse
pid='$id'
for t in json.load(sys.stdin):
    u = t.get('url','')
    if '/maps/place/' in u:
        name = urllib.parse.unquote(u.split('/maps/place/')[1].split('/')[0])
        m = re.search(r'@([0-9.]+),([0-9.]+)', u)
        if m:
            print(json.dumps({'id': pid, 'name': name, 'lat': float(m.group(1)), 'lng': float(m.group(2))}, ensure_ascii=False))
        break"
  kill $CPID 2>/dev/null; wait $CPID 2>/dev/null
  sleep 2
done >> "$OUT/places.jsonl"
echo DONE
