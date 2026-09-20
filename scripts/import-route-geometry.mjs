import { readFileSync, writeFileSync } from 'node:fs'

const checkedAt = process.argv[2]
const write = process.argv.includes('--write')
if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt ?? '')) throw new Error('Usage: node scripts/import-route-geometry.mjs YYYY-MM-DD [--write]')
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`Source response: ${response.status}`)
  return response.json()
}
const files = ['cityview', 'cityview-night', 'islandview'].map(id => `src/data/routes/${id}.json`)
const routes = files.map(file => JSON.parse(readFileSync(file, 'utf8')))
const api = 'https://www.kotsu-city-kagoshima.jp/wp/timesearch/'
for (const [index, id] of ['1680', '1660'].entries()) {
  const route = routes[index]
  const source = `${api}strEnd.php?rosen_id=${id}&str_id=&end_id=&kubun=&color=0`
  const stops = await json(source)
  if (stops.length !== (index === 0 ? 20 : 8)) throw new Error(`${id}: stop count changed`)
  const coordinates = []
  const segmentSources = []
  for (let i = 0; i < stops.length - 1; i++) {
    const url = `${api}line.php?str_id=${stops[i].id}&end_id=${stops[i + 1].id}&color=0`
    const segment = await json(url)
    if (!Array.isArray(segment) || segment.length < 2) throw new Error(`${id}: missing segment ${i}`)
    for (const point of segment) {
      const coordinate = [Number(point.keido), Number(point.ido)]
      if (coordinate.some(value => !Number.isFinite(value))) throw new Error('Invalid coordinate')
      if (JSON.stringify(coordinate) !== JSON.stringify(coordinates.at(-1))) coordinates.push(coordinate)
    }
    segmentSources.push(url)
  }
  route.geometry = [{ course: 'default', method: 'official-polyline', source, segmentSources, checkedAt, coordinates }]
  route.stops.forEach((stop, i) => {
    stop.officialMapStopId = stops[i].id
    // 기존 현장 실측 좌표는 자동으로 덮어쓰지 않는다.
    if (!route.metadata.lastFieldVerifiedAt) {
      stop.lat = Number(stops[i].ido)
      stop.lng = Number(stops[i].keido)
    }
  })
  route.metadata.coordinateSource = source
  console.log(`${route.metadata.routeId}: ${coordinates.length} official road vertices`)
}

// GTFS에 shapes.txt가 없는 아일랜드뷰는 공식 정류장 순서를 따라 도로 형상을 계산한다.
// 공식 운행 궤적이라고 표시하지 않고 공식 PDF와 별도로 대조해야 한다.
const island = routes[2]
const mountain = JSON.parse(readFileSync('scripts/data/island-mountain-road.json', 'utf8'))
island.geometry = []
for (const course of ['A', 'B']) {
  const stops = island.stops.filter(stop => stop.courses.includes(course))
  const sections = [stops.filter(stop => stop.number <= 10), [...stops.filter(stop => stop.number >= 11), stops[0]]]
  const parts = []
  const sources = []
  for (const section of sections) {
    const waypoints = section.map(stop => [stop.lng, stop.lat])
    const source = `https://router.project-osrm.org/route/v1/driving/${waypoints.map(point => point.join(',')).join(';')}?overview=full&geometries=geojson&continue_straight=false`
    const result = await json(source)
    if (result.code !== 'Ok' || !result.routes?.[0]?.geometry?.coordinates?.length) throw new Error('No road route')
    if (result.waypoints.some(point => point.distance > 100)) throw new Error('Road snap exceeds 100m; manual review required')
    parts.push(result.routes[0].geometry.coordinates)
    sources.push(source)
  }
  // 최단 자동차 경로가 산길을 우회하므로 이 구간은 공식 PDF와 대조한 OSM 도로를 잇는다.
  const coordinates = [...parts[0], ...mountain.coordinates, ...parts[1]]
  island.geometry.push({ course, method: 'road-reference', source: mountain.source, segmentSources: sources,
    roadWays: mountain.ways, checkedAt, comparedWith: island.metadata.scheduleSource, coordinates })
  console.log(`islandview ${course}: ${coordinates.length} road vertices`)
}
if (write) files.forEach((file, i) => writeFileSync(file, JSON.stringify(routes[i], null, 2) + '\n'))
