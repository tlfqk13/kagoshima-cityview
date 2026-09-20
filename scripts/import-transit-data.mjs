import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { parse } from 'csv-parse/sync'

// 공식 승강장 ID 매핑이다. 정류장 수·ID 변경은 추측하지 않고 실패한다.
const [zip, checkedAt] = process.argv.slice(2)
const write = process.argv.includes('--write')
if (!zip || !/^\d{4}-\d{2}-\d{2}$/.test(checkedAt ?? '')) throw new Error('Usage: node scripts/import-transit-data.mjs official.zip YYYY-MM-DD [--write]')
const feedUrl = 'https://data.bodik.jp/dataset/a8d9d4cd-ee6d-4d79-98fe-6d37f046c537/resource/7e52d8fb-9a25-44ca-ad88-1f32bfb3d8b6/download/bus-kagoshimacity-kagoshima-jp.zip'
const table = name => parse(execFileSync('unzip', ['-p', zip, `${name}.txt`], { maxBuffer: 30_000_000 }), { columns: true, bom: true })
const stops = new Map(table('stops').map(stop => [stop.stop_id, stop]))
const trips = table('trips')
const times = table('stop_times')
const feed = table('feed_info')[0]
const sha256 = createHash('sha256').update(readFileSync(zip)).digest('hex')
const config = {
  cityview: { routes: ['9121'], ids: ['156-4', '45-1', '343-2', '285-1', '220-1', '286-1', '287-1', '290-2', '220-2', '293-1', '447-1', '288-1', '48-1', '47-1', '1206-1', '254-1', '368-2', '128-4', '343-5', '156-1'] },
  'cityview-night': { routes: ['9022'], ids: ['156-4', '343-2', '368-1', '230-7', '287-1', '285-2', '343-5'] },
  islandview: { routes: ['9061', '9071'], ids: ['274-1', '629-1', '801-1', '535-1', '205-1', '53-1', '38-2', '402-1', '38-1', '716-1', '717-1', '40-3'] },
}
const updates = []
const reference = { source: feedUrl, sha256, checkedAt, feed, routes: {} }
for (const [routeId, mapping] of Object.entries(config)) {
  const file = `src/data/routes/${routeId}.json`
  const route = JSON.parse(readFileSync(file, 'utf8'))
  if (route.stops.length !== mapping.ids.length) throw new Error(`${routeId}: stop count changed`)
  const tripIds = new Set(trips.filter(trip => mapping.routes.includes(trip.route_id)).map(trip => trip.trip_id))
  if (!tripIds.size) throw new Error(`${routeId}: no trips`)
  const selectedTimes = times.filter(time => tripIds.has(time.trip_id))
  reference.routes[routeId] = []
  for (const [index, stop] of route.stops.entries()) {
    const gtfsStop = stops.get(mapping.ids[index])
    if (!gtfsStop) throw new Error(`${routeId}: missing stop ${mapping.ids[index]}`)
    const matched = selectedTimes.filter(time => time.stop_id === gtfsStop.stop_id
      && (routeId !== 'islandview' || stop.number !== 1 || Number(time.stop_sequence) === 1))
    if (!matched.length) throw new Error(`${routeId}: missing times for ${gtfsStop.stop_id}`)
    const departures = [...new Set(matched.map(time => time.departure_time.slice(0, 5)))].sort()
    stop.gtfsStopId = gtfsStop.stop_id
    if (routeId === 'islandview') {
      console.log(`${stop.id}: ${stop.lat},${stop.lng} -> ${gtfsStop.stop_lat},${gtfsStop.stop_lon}`)
      stop.lat = Number(gtfsStop.stop_lat)
      stop.lng = Number(gtfsStop.stop_lon)
      delete stop.coordinatesApproximate
    }
    if (routeId !== 'cityview-night') {
      stop.schedule.departures = departures
      if (routeId === 'cityview' && index === 19) stop.schedule.arrivalOnly = true
    }
    reference.routes[routeId].push({ id: stop.id, gtfsStopId: gtfsStop.stop_id, name: gtfsStop.stop_name,
      coordinates: [Number(gtfsStop.stop_lon), Number(gtfsStop.stop_lat)], departures })
  }
  Object.assign(route.metadata, {
    sourceVersion: feed.feed_version, lastUpdatedAt: checkedAt, lastSourceCheckedAt: checkedAt,
    gtfs: { url: feedUrl, sha256, routeIds: mapping.routes, validFrom: feed.feed_start_date, validUntil: feed.feed_end_date },
  })
  if (routeId === 'islandview') {
    route.metadata.coordinatesApproximate = false
    route.metadata.coordinateSource = `${feedUrl} (stops.txt; platform IDs stored per stop)`
    route.metadata.scheduleSource = 'https://www.kotsu-city-kagoshima.jp/wp/wp-content/uploads/2026/07/b1bf84b7578394e6a205dcd3d0461da5.pdf'
    route.metadata.disclaimer = {
      ko: '공식 GTFS 승강장 좌표 · 현장 미검증. A/B 코스 교대 운행. 도로 경로는 공식 코스와 대조한 참고 경로입니다.',
      en: 'Official GTFS platform coordinates; not field verified. Courses A/B alternate. Road geometry is a reference checked against the official course map.',
      ja: '公式GTFSの乗り場座標・現地未確認。A/Bコース交互運行。道路形状は公式コース図と照合した参考経路です。',
    }
    route.stops[11].name = { ko: '오슈 초등학교 앞', en: 'Oshu Elementary School', ja: '桜洲小学校前' }
    route.stops[11].schedule.operatingNote = {
      ko: '하루 15편. 공식 안내: 2026년 10월부터 「오슈 초등학교 터」로 명칭 변경 예정.',
      en: '15 daily runs. Official notice: renamed "Former Oshu Elementary School" in October 2026.',
      ja: '1日15便。公式案内では2026年10月に「桜洲小学校跡」へ改称予定。',
    }
  }
  if (routeId === 'cityview-night') {
    route.metadata.fare = { adult: 230, child: 120 }
    route.metadata.dayPass = { adult: 250, child: 130 }
    route.metadata.scheduleSource = 'https://www.kotsu-city-kagoshima.jp/wp/timesearch/bus_list.php?rosenId=1660&syubetuId=0'
  }
  updates.push([file, route])
}
// 기본은 대조만 수행한다. 승인 범위 내 갱신 시 --write로 JSON을 일괄 생성한다.
if (write) {
  for (const [file, value] of updates) writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
  writeFileSync('tests/fixtures/official-gtfs.json', JSON.stringify(reference, null, 2) + '\n')
}
console.log(JSON.stringify({ checkedAt, version: feed.feed_version, sha256, written: write }))
