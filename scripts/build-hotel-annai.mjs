// 호텔별 A4 한 장 「ご案内」(첫 연락 메일 첨부용) 생성기.
//   node scripts/build-hotel-annai.mjs [slug ...]   (slug 없으면 generic 1장)
// 구조는 docs/proposal/jp-proposal-patterns.md 의 정공법(課題→概要→特徴3→条件→流れ→連絡先)을 따른다.
// 화면 캡처는 BASE_URL(기본: 운영)에서 찍는다. 산출물: docs/proposal/annai/KagoshimaCityView_Annai_<slug>_<YYYYMMDD>.pdf
// 산출 PDF에는 상세 주소가 들어가므로 git에 올리지 않는다(.gitignore). 발송할 때 이 폴더에서 첨부한다.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const ROOT = process.cwd()
const BASE = process.env.BASE_URL ?? 'https://kagoshima.makoro.dev'
const OUT = resolve(ROOT, process.env.ANNAI_PUBLIC === '1' ? 'public/downloads/annai' : 'docs/proposal/annai')
const CONTACT_NAME = process.env.ANNAI_NAME ?? 'ソン・ドンギュ'
// 안내서에 넣는 POP 그림의 색 — 호텔 이미지 컬러로 미리 보여줄 때 ANNAI_ACCENT=RRGGBB ANNAI_DARK=RRGGBB
const THEME_QS = ['accent', 'dark'].map(k => (process.env[`ANNAI_${k.toUpperCase()}`] ? `&${k}=${process.env[`ANNAI_${k.toUpperCase()}`]}` : '')).join('')
// 소재지 — 저장소가 공개라 상세 주소는 커밋하지 않는다. ~/.config/makoro/company.json 에만 두고, 없으면 도시까지만.
const COMPANY_FILE = resolve(homedir(), '.config/makoro/company.json')
const company = existsSync(COMPANY_FILE) ? JSON.parse(readFileSync(COMPANY_FILE, 'utf8')) : {}
// ANNAI_PUBLIC=1 이면 사이트에 올리는 공개판(문의 폼처럼 첨부가 안 될 때 링크로 보낸다): 도시까지만, public/downloads/annai/ 에 날짜 없는 이름으로
const PUBLIC = process.env.ANNAI_PUBLIC === '1'
const ADDRESS = PUBLIC ? '大韓民国 仁川広域市' : (company.addressJa ?? '大韓民国 仁川広域市')
const today = process.env.ANNAI_DATE ? new Date(process.env.ANNAI_DATE + 'T00:00:00Z') : new Date(Date.now() + 9 * 3600e3) // JST. ANNAI_DATE=YYYY-MM-DD 로 발송일을 지정
const ymd = today.toISOString().slice(0, 10)
const ymdCompact = ymd.replaceAll('-', '')
const dateJa = `${today.getUTCFullYear()}年${today.getUTCMonth() + 1}月${today.getUTCDate()}日`

const hotels = JSON.parse(readFileSync(resolve(ROOT, 'src/data/hotels.json'), 'utf8')).hotels
const route = JSON.parse(readFileSync(resolve(ROOT, 'src/data/routes/cityview.json'), 'utf8'))
const audit = JSON.parse(readFileSync(resolve(ROOT, 'src/data/accuracy-audit.json'), 'utf8'))
const stops = route.stops.slice().sort((a, b) => a.number - b.number)
const stopById = id => stops.find(s => s.id === id)
const verifiedAt = route.metadata?.lastFieldVerifiedAt ?? '2026-05-31'
const offCount = audit.stops.filter(s => s.grade !== 'ok').length
const worst = audit.stops.reduce((a, b) => (b.errorMeters > a.errorMeters ? b : a))

// src/lib/hotels.ts 와 같은 계산 (도보 80m/분, 도보권 450m)
const WALK = 80, WALKABLE = 450
function dist(lat1, lng1, lat2, lng2) {
  const R = 6371000, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
const min = m => Math.max(1, Math.round(m / WALK))
function hotelStops(h) {
  const board = stopById(h.stopId)
  const bm = dist(h.lat, h.lng, board.lat, board.lng)
  const walkable = stops.map(s => ({ s, m: dist(h.lat, h.lng, s.lat, s.lng) })).filter(x => x.m <= WALKABLE)
  const last = walkable.reduce((best, cur) => (!best || cur.s.number > best.s.number ? cur : best), null)
  const al = last && last.s.number > board.number ? last : { s: board, m: bm }
  return { board, boardMin: min(bm), alight: al.s, alightMin: min(al.m) }
}

const img = p => `data:image/jpeg;base64,${readFileSync(p).toString('base64')}`

function html(h, shots) {
  const hs = h ? hotelStops(h) : null
  const addressee = h ? `${h.nameJa} 様<br><span class="sub">フロントご担当者様</span>` : '宿泊施設 ご担当者様'
  const personal = h
    ? `<div class="stops">
        <div><small>乗る停留所</small><b>No.${hs.board.number} ${hs.board.name.ja.replace(/（.*?）/g, '')}</b><span>徒歩約${hs.boardMin}分</span></div>
        <i>→</i>
        <div><small>帰りに降りる停留所</small><b>No.${hs.alight.number} ${hs.alight.name.ja.replace(/（.*?）/g, '')}</b><span>徒歩約${hs.alightMin}分</span></div>
      </div>`
    : `<div class="stops"><div><small>施設ごとに</small><b>乗る停留所・帰りに降りる停留所</b><span>専用QRでご案内します</span></div></div>`
  const previewUrl = h ? `${BASE}/map?hotel=${h.slug}` : `${BASE}/map`
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>シティビュー停留所案内 卓上POPのご案内</title>
<style>
  @page { size: A4 portrait; margin: 13mm 16mm 11mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic', Meiryo, sans-serif; font-size: 9.8pt; line-height: 1.65; color: #333; }
  b { color: #1a1a1a; }
  .top { display: flex; justify-content: space-between; font-size: 8.5pt; color: #777; margin-bottom: 3mm; }
  .to { font-size: 11.5pt; color: #1a1a1a; margin-bottom: 4mm; line-height: 1.4; }
  .to .sub { font-size: 9pt; color: #666; }
  h1 { font-size: 17pt; line-height: 1.4; color: #1a1a1a; margin-bottom: 4mm; }
  .lead { font-size: 10.3pt; margin-bottom: 6mm; }
  h2 { font-size: 11.5pt; color: #1a1a1a; margin: 0 0 3.5mm; line-height: 1.3; }
  .hero2 { display: grid; grid-template-columns: 84mm 1fr; gap: 8mm; align-items: start; margin-bottom: 6mm; }
  .shots { display: grid; grid-template-columns: 46mm 34mm; gap: 4mm; align-items: start; }
  .shots figure { margin: 0; }
  .shots img { width: 100%; display: block; border: 1px solid #bbb; border-radius: 2px; }
  .shots figcaption { font-size: 8pt; color: #666; line-height: 1.45; margin-top: 2mm; text-align: center; }
  .stops { display: flex; align-items: center; gap: 3mm; background: #FBF7F1; border: 1px solid #D9C8B2; border-radius: 3px; padding: 4mm; margin-bottom: 5mm; }
  .stops > div { flex: 1; display: flex; flex-direction: column; gap: 0.5mm; }
  .stops small { font-size: 8pt; color: #777; line-height: 1.3; }
  .stops b { font-size: 11.5pt; line-height: 1.35; }
  .stops span { font-size: 8.5pt; color: #555; line-height: 1.3; }
  .stops i { font-style: normal; color: #8B4513; font-size: 12pt; }
  .pts { list-style: none; }
  .pts li { padding: 2.2mm 0 2.2mm 5mm; border-top: 1px solid #e5e0d8; position: relative; font-size: 9.6pt; line-height: 1.6; }
  .pts li::before { content: ""; position: absolute; left: 0; top: 4.6mm; width: 2mm; height: 2mm; border-radius: 50%; background: #8B4513; }
  .why { display: grid; grid-template-columns: 72mm 1fr; gap: 8mm; align-items: center; margin-bottom: 6mm; }
  .figwrap { height: 39mm; overflow: hidden; border: 1px solid #bbb; border-radius: 2px; }
  .fig { width: 100%; height: 100%; object-fit: cover; object-position: 50% 45%; display: block; }
  .why p { font-size: 9.6pt; line-height: 1.75; } .why p + p { margin-top: 2mm; }
  .cond { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 2.5mm; }
  .cond div { background: #F4EFE9; border-radius: 3px; padding: 3mm 2mm; text-align: center; }
  .cond b { display: block; font-size: 12pt; line-height: 1.4; }
  .cond small { font-size: 8.3pt; color: #666; line-height: 1.4; display: block; }
  .note { font-size: 8.5pt; color: #666; line-height: 1.6; margin-bottom: 5mm; }
  .cta { padding: 4.5mm 6mm; background: #1F1E1A; color: #fff; border-radius: 3px; margin-bottom: 5mm; }
  .cta b { font-size: 11pt; color: #fff; display: block; line-height: 1.5; }
  .cta small { font-size: 8.6pt; color: #ddd; display: block; line-height: 1.6; margin-top: 1mm; }
  .foot { border-top: 1px solid #ccc; padding-top: 3mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.6pt; color: #444; line-height: 1.7; }
  .foot .credit { font-size: 7.6pt; color: #888; }
  .qr { width: 21mm; height: 21mm; }
</style></head><body>
  <div class="top"><span>${dateJa}</span><span>MAKORO（マコロ）｜ 鹿児島シティビューバスガイド 運営</span></div>
  <div class="to">${addressee}</div>
  <h1>外国人のお客様向け「シティビュー停留所案内」<br>卓上POPのご案内</h1>
  <p class="lead">フロントに卓上POP（A6）を1枚置いていただくと、外国人のお客様がQRを読むだけで、<b>ホテルからシティビューバスの乗り場までの道順</b>と<b>次のバスまでの時間</b>を、ご自身の言語で確認できます。</p>

  <div class="hero2">
    <div class="shots">
      <figure><img src="${shots.pop}" alt=""><figcaption>フロントに置く卓上POP（A6）${THEME_QS ? '<br>貴館のイメージに合わせた配色例' : ''}</figcaption></figure>
      <figure><img src="${shots.phone}" alt=""><figcaption>QRを読んだ画面</figcaption></figure>
    </div>
    <div class="say">
      <h2>${h ? h.nameJa + ' 様の場合' : 'QRを読むと'}</h2>
      ${personal}
      <ul class="pts">
        <li>日本語・英語・韓国語・繁体字中国語の<b>4か国語</b>。アプリは不要です</li>
        <li>POPの<b>色やデザイン</b>は、貴館のイメージに合わせてお作りします</li>
        <li>行きと帰りで停留所が違う場合も、地図で両方をご案内します</li>
      </ul>
    </div>
  </div>

  <div class="why">
    <div class="figwrap"><img class="fig" src="${img(resolve(ROOT, 'public/images/home/tenmonkan-map.jpg'))}" alt=""></div>
    <div>
      <h2>なぜ必要か</h2>
      <p>Googleマップでは、天文館の停留所は<b>1か所</b>（赤いピン）しか表示されません。実際の乗り場は方面別に<b>2か所</b>（No.3・No.19）あり、ピンから86m・74m離れています。</p>
      <p>全${audit.stops.length}停留所を現地で確認したところ、${offCount}か所で50m以上のずれがありました（${audit.auditedAt} 調査）。</p>
    </div>
  </div>

  <div class="cond">
    <div><b>無料</b><small>費用は一切かかりません</small></div>
    <div><b>広告なし</b><small>画面にも印刷物にもありません</small></div>
    <div><b>契約・申込不要</b><small>置くだけ。やめるときは外すだけ</small></div>
  </div>
  <p class="note">無料でご提供する理由：鹿児島市観光課による公式採用を目指しており、宿泊施設様でのご利用実績を積み重ねるためです。</p>

  <div class="cta">
    <div><b>ご関心をお持ちいただけましたら、son@makoro.dev までご返信ください。</b><small>POPとポスターのPDFをお送りします（印刷したものの郵送も可能です）。置くかどうかは貴館のご判断にお任せします。</small></div>
  </div>

  <div class="foot">
    <div>
      <b>MAKORO（マコロ）</b>　旅行者向け公共交通案内サービスの開発・運営<br>
      所在地：${ADDRESS}<br>
      担当：${CONTACT_NAME}　｜　son@makoro.dev　｜　https://makoro.dev<br>
      鹿児島シティビューバスガイド：${previewUrl}<br>
      <span class="credit">データ提供：鹿児島市（原データより加工）　停留所位置は${verifiedAt}に現地確認</span>
    </div>
    <img class="qr" src="${shots.qr}" alt="">
  </div>
</body></html>`
}

mkdirSync(OUT, { recursive: true })
const slugs = process.argv.slice(2)
const targets = slugs.length ? slugs.map(s => hotels.find(h => h.slug === s) ?? (() => { throw new Error(`unknown hotel: ${s}`) })()) : [null]
const b = await chromium.launch()
for (const h of targets) {
  const key = h ? h.slug : 'generic'
  // 스마트폰 화면·POP 캡처
  const m = await b.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 2 })
  const p = await m.newPage(); await p.addInitScript(() => localStorage.setItem('pwa-install-dismissed', '1'))
  await p.goto(`${BASE}/map${h ? `?hotel=${h.slug}&` : '/stop_03?'}lang=ja`, { waitUntil: 'load' }); await p.waitForTimeout(6000)
  const phonePng = await p.screenshot({ type: 'jpeg', quality: 80 })
  await m.close()
  const c = await b.newContext({ viewport: { width: 397, height: 560 }, deviceScaleFactor: 2 })
  const q = await c.newPage()
  await q.goto(`${BASE}/card/site?${h ? `hotel=${h.slug}` : ''}${THEME_QS}`, { waitUntil: 'load' }); await q.waitForTimeout(2500)
  await q.emulateMedia({ media: 'print' }); await q.waitForTimeout(300)
  const popPng = await q.screenshot({ type: 'jpeg', quality: 80 })
  // 사이트 QR: 카드의 QR(svg data URL)을 그대로 쓴다
  const qrSrc = await q.getAttribute('img[alt^="QR code"]', 'src')
  await c.close()
  const shots = { phone: `data:image/jpeg;base64,${phonePng.toString('base64')}`, pop: `data:image/jpeg;base64,${popPng.toString('base64')}`, qr: qrSrc }
  const doc = html(h, shots)
  const htmlPath = resolve(ROOT, 'docs/proposal/annai', `${key}${PUBLIC ? '.public' : ''}.html`)
  writeFileSync(htmlPath, doc)
  const pdf = await b.newPage()
  await pdf.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' })
  const pages = await pdf.evaluate(() => Math.ceil(document.documentElement.scrollHeight / (297 * 96 / 25.4)))
  const out = resolve(OUT, PUBLIC ? `KagoshimaCityView_Annai_${key}.pdf` : `KagoshimaCityView_Annai_${key}_${ymdCompact}.pdf`)
  // 반드시 한 장 — 호텔 이름이 길어 줄이 늘면 넘칠 수 있으므로, 한 장에 들어올 때까지 배율을 조금씩 낮춘다
  let used = null
  for (const scale of [1, 0.97, 0.94, 0.91, 0.88]) {
    const buf = await pdf.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, scale })
    if ((buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length === 1) { writeFileSync(out, buf); used = scale; break }
  }
  if (!used) throw new Error(`${key}: 한 장에 들어가지 않습니다`)
  await pdf.close()
  console.log('pdf', out.replace(ROOT + '/', ''), `(${(readFileSync(out).length / 1024).toFixed(0)} KB, 1 page, scale ${used})`)
}
await b.close()
