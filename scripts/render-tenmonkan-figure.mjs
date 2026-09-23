// 랜딩 「つくった理由」용 실제 지도 그림 — 天文館: 지도 앱의 핀은 1개, 실제 정류장은 방향별 2곳.
// 우리 Mapbox 지도를 그대로 캡처한다(© Mapbox © OpenStreetMap 표기는 캡션에서). 좌표는 JSON에서만 읽는다(ISS-001).
//   NEXT_PUBLIC_MAPBOX_TOKEN=... node scripts/render-tenmonkan-figure.mjs
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const env = fs.existsSync('.env.local') ? Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] })) : {}
const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || env.NEXT_PUBLIC_MAPBOX_TOKEN
if (!token) { console.error('NEXT_PUBLIC_MAPBOX_TOKEN이 없습니다'); process.exit(1) }

const route = JSON.parse(fs.readFileSync('src/data/routes/cityview.json', 'utf8'))
const audit = JSON.parse(fs.readFileSync('src/data/accuracy-audit.json', 'utf8'))
const stop = n => route.stops.find(s => s.number === n)
const a3 = audit.stops.find(s => s.number === 3), a19 = audit.stops.find(s => s.number === 19)
const s3 = stop(3), s19 = stop(19)
const google = [a3.googleLng, a3.googleLat]
const center = [(s3.lng + s19.lng + google[0]) / 3, (s3.lat + s19.lat + google[1]) / 3]

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://api.mapbox.com/mapbox-gl-js/v3.26.0/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.26.0/mapbox-gl.js"></script>
<style>
  body{margin:0} #m{width:1200px;height:760px}
  .pin{width:44px;height:44px;border-radius:50%;background:#8B4513;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);color:#fff;font:700 18px/38px 'Hiragino Kaku Gothic ProN',sans-serif;text-align:center}
  .g{width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#C0392B;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}
  .g span{transform:rotate(45deg);color:#fff;font:700 22px/1 sans-serif}
  .tag{background:#fff;border:2px solid #2F6A8F;color:#2F6A8F;border-radius:999px;padding:3px 10px;font:700 15px/1.3 sans-serif;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.25)}
</style></head><body><div id="m"></div><script>
mapboxgl.accessToken=${JSON.stringify(token)};
const map=new mapboxgl.Map({container:'m',style:'mapbox://styles/mapbox/streets-v12',center:${JSON.stringify(center)},zoom:17.6,language:'ja',attributionControl:false,interactive:false});
map.on('load',()=>{
  const line=(a,b,id)=>{map.addSource(id,{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:[a,b]}}});map.addLayer({id:id+'c',type:'line',source:id,layout:{'line-cap':'round'},paint:{'line-color':'#fff','line-width':8}});map.addLayer({id,type:'line',source:id,layout:{'line-cap':'round'},paint:{'line-color':'#2F6A8F','line-width':4,'line-dasharray':[0.2,1.6]}})};
  line(${JSON.stringify(google)},[${s3.lng},${s3.lat}],'l3'); line(${JSON.stringify(google)},[${s19.lng},${s19.lat}],'l19');
  const el=(cls,txt)=>{const d=document.createElement('div');d.className=cls;d.innerHTML=txt;return d};
  new mapboxgl.Marker({element:el('pin','3'),anchor:'center'}).setLngLat([${s3.lng},${s3.lat}]).addTo(map);
  new mapboxgl.Marker({element:el('pin','19'),anchor:'center'}).setLngLat([${s19.lng},${s19.lat}]).addTo(map);
  new mapboxgl.Marker({element:el('g','<span>?</span>'),anchor:'bottom'}).setLngLat(${JSON.stringify(google)}).addTo(map);
  const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  new mapboxgl.Marker({element:el('tag','${a3.errorMeters} m'),anchor:'center',offset:[0,-16]}).setLngLat(mid(${JSON.stringify(google)},[${s3.lng},${s3.lat}])).addTo(map);
  new mapboxgl.Marker({element:el('tag','${a19.errorMeters} m'),anchor:'center',offset:[0,16]}).setLngLat(mid(${JSON.stringify(google)},[${s19.lng},${s19.lat}])).addTo(map);
  map.once('idle',()=>{document.title='ready'});
});
</script></body></html>`
const tmp = path.join(process.env.TMPDIR || '/tmp', 'tenmonkan-figure.html')
fs.writeFileSync(tmp, html)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: 1 })
await page.goto('file://' + tmp)
await page.waitForFunction(() => document.title === 'ready', null, { timeout: 60000 })
await page.waitForTimeout(1500)
const out = 'public/images/home/tenmonkan-map.png'
await page.screenshot({ path: out })
await browser.close(); fs.unlinkSync(tmp)
console.log('wrote', out, `(google→No.3 ${a3.errorMeters}m, →No.19 ${a19.errorMeters}m, audited ${audit.auditedAt})`)
