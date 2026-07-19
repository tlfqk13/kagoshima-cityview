#!/usr/bin/env python3
"""구글맵 정류장 위치 감사 — 2단계: 수집된 DOM에서 후보 좌표 추출·오차 계산.

방법론:
- 검색 결과 목록(hfpxzc 앵커)에서 이름+좌표 추출
- 구글이 장소 페이지로 직행한 경우 !8m2!3d 좌표 추출,
  DOM에 좌표가 없으면 places.jsonl(CDP로 수집한 장소 URL 좌표) 사용
- 이름 유사도 최고 후보(best match) 기준으로 공식 좌표와 오차(haversine) 계산
- 판정: <50m 정상, 50~100m 주의, >=100m 오류

사용: python3 scripts/google-maps-audit/parse.py [routeId]   (기본 cityview)
"""
import json, re, math, sys, os
from difflib import SequenceMatcher

ROUTE_ID = sys.argv[1] if len(sys.argv) > 1 else 'cityview'
DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(DIR, 'out')
ANCHOR_RE = re.compile(r'<a class="hfpxzc" aria-label="([^"]+)" href="[^"]*?!3d([0-9.]+)!4d([0-9.]+)"')

def norm(s: str) -> str:
    s = re.sub(r'（[^）]*）', '', s)
    s = re.sub(r'\([^)]*\)', '', s)
    return s.replace('バス', '').replace(' ', '').replace('　', '')

def sim(a: str, b: str) -> float:
    return SequenceMatcher(None, norm(a), norm(b)).ratio()

def haversine_m(lat1, lng1, lat2, lng2) -> float:
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

stops = json.load(open(f'src/data/routes/{ROUTE_ID}.json'))['stops']

# CDP로 취득한 장소 페이지 좌표 (DOM에 좌표가 없는 정류장용 fallback)
places = {}
places_path = os.path.join(OUT, 'places.jsonl')
if os.path.exists(places_path):
    for line in open(places_path, encoding='utf-8'):
        p = json.loads(line)
        places[p['id']] = p

out = []
for s in stops:
    path = os.path.join(OUT, f"{s['id']}.html")
    results = []
    if os.path.exists(path):
        html = open(path, encoding='utf-8', errors='ignore').read()
        for label, lat, lng in ANCHOR_RE.findall(html):
            results.append({'name': label, 'lat': float(lat), 'lng': float(lng)})
        if not results:
            title_m = re.search(r'<title>([^<]+?) - Google マップ</title>', html)
            place_name = title_m.group(1) if title_m else '(unknown)'
            for lat, lng in re.findall(r'!8m2!3d([0-9.]+)!4d([0-9.]+)', html):
                results.append({'name': place_name, 'lat': float(lat), 'lng': float(lng), 'placePage': True})
            if not results:
                for lat, lng in re.findall(r'!3d([0-9.]+)!4d([0-9.]+)', html)[:1]:
                    results.append({'name': place_name, 'lat': float(lat), 'lng': float(lng), 'placePage': True})
    if not results and s['id'] in places:
        p = places[s['id']]
        results.append({'name': p['name'], 'lat': p['lat'], 'lng': p['lng'], 'placePage': True})

    seen, uniq = set(), []
    for r in results:
        key = (r['name'], round(r['lat'], 6), round(r['lng'], 6))
        if key not in seen:
            seen.add(key)
            uniq.append(r)

    olat, olng = s['lat'], s['lng']
    for r in uniq:
        r['errM'] = round(haversine_m(olat, olng, r['lat'], r['lng']))
        r['sim'] = round(sim(s['name']['ja'], r['name']), 2)

    best = max(uniq, key=lambda r: r['sim'], default=None)
    nearest = min(uniq, key=lambda r: r['errM'], default=None)
    out.append({
        'id': s['id'], 'number': s['number'],
        'nameJa': s['name']['ja'], 'nameKo': s['name']['ko'],
        'official': {'lat': olat, 'lng': olng},
        'resultCount': len(uniq),
        'bestMatch': best, 'nearest': nearest,
        'allResults': uniq,
    })

json.dump(out, open(os.path.join(OUT, 'audit.json'), 'w'), ensure_ascii=False, indent=1)

def grade(err):
    if err is None: return '—'
    if err < 50: return '정상'
    if err < 100: return '주의'
    return '오류'

print(f"{'No':>2} {'정류장(ko)':<22} {'후보수':>3} {'유사도':>5} {'오차(m)':>7} 판정")
for o in out:
    b = o['bestMatch']
    if b:
        print(f"{o['number']:>2} {o['nameKo']:<22} {o['resultCount']:>3} {b['sim']:>5} {b['errM']:>7} {grade(b['errM'])}  ← {b['name']}")
    else:
        print(f"{o['number']:>2} {o['nameKo']:<22} {o['resultCount']:>3}     -       - 결과없음")
