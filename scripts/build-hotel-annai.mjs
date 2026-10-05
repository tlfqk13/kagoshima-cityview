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
    ? `<div class="box personal">
        <div class="boxTitle">${h.nameJa} 様の場合</div>
        <table class="kv">
          <tr><th>乗る停留所</th><td><b>No.${hs.board.number} ${hs.board.name.ja}</b>（徒歩約${hs.boardMin}分）</td></tr>
          <tr><th>帰りに降りる</th><td><b>No.${hs.alight.number} ${hs.alight.name.ja}</b>（徒歩約${hs.alightMin}分）</td></tr>
        </table>
        <p class="note">シティビューは一方向の循環路線のため、行きと帰りで停留所が異なる場合があります。QRを読むと、この2か所と道順がお客様の言語で表示されます。</p>
      </div>`
    : `<div class="box personal">
        <div class="boxTitle">宿泊施設ごとの専用QR</div>
        <p class="note">施設ごとに「乗る停留所」「帰りに降りる停留所」と道順を表示する専用QRをお作りします。シティビューは一方向の循環路線のため、行きと帰りで停留所が異なる場合があります。</p>
      </div>`
  const previewUrl = h ? `${BASE}/map?hotel=${h.slug}` : `${BASE}/map`
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>シティビュー停留所案内 卓上POPのご案内</title>
<style>
  @page { size: A4 portrait; margin: 11mm 14mm 9mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic', Meiryo, sans-serif; font-size: 8.6pt; line-height: 1.5; color: #333; }
  .top { display: flex; justify-content: space-between; font-size: 8pt; color: #666; margin-bottom: 2mm; }
  .to { font-size: 10.5pt; color: #1a1a1a; margin-bottom: 2mm; line-height: 1.35; }
  .to .sub { font-size: 8.5pt; color: #666; }
  h1 { font-size: 14pt; line-height: 1.35; color: #1a1a1a; letter-spacing: 0.01em; margin-bottom: 1.5mm; }
  .tagline { display: inline-block; font-size: 8.8pt; font-weight: 700; color: #8B4513; border: 1px solid #8B4513; border-radius: 2px; padding: 0.3mm 2.5mm; margin-bottom: 3mm; }
  .lead { margin-bottom: 3mm; }
  h2 { font-size: 10pt; color: #1a1a1a; border-left: 3px solid #8B4513; padding-left: 2.5mm; margin: 0 0 1.5mm; line-height: 1.3; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 3mm; }
  .grid.prob { grid-template-columns: 1.05fr 1fr; }
  .box { border: 1px solid #ddd; border-radius: 2px; padding: 2mm 3mm; }
  .boxTitle { font-weight: 700; margin-bottom: 1.5mm; color: #1a1a1a; }
  ul { padding-left: 4.5mm; }
  li { margin-bottom: 0.8mm; }
  .fig { width: 100%; height: 34mm; object-fit: cover; object-position: 45% 40%; border: 1px solid #ddd; display: block; }
  .cap { font-size: 7.3pt; color: #666; margin-top: 0.8mm; line-height: 1.4; }
  .feat { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; margin-bottom: 3mm; }
  .feat div { border-top: 2px solid #8B4513; padding-top: 1.5mm; }
  .feat b { display: block; margin-bottom: 0.5mm; color: #1a1a1a; }
  .feat small { font-size: 8pt; color: #444; line-height: 1.45; display: block; }
  .main { display: grid; grid-template-columns: 1fr 84.5mm; gap: 6mm; margin-bottom: 2.5mm; align-items: start; }
  .main .fig { margin-top: 2mm; height: 25mm; }
  .shots { display: grid; grid-template-columns: 45mm 35.5mm; gap: 4mm; align-items: start; }
  .shots figure { margin: 0; }
  .shots img { width: 100%; display: block; border: 1px solid #bbb; border-radius: 2px; } /* 그림자는 PDF 뷰어에 따라 회색 띠로 보여서 쓰지 않는다 */
  .shots figcaption { font-size: 7.3pt; color: #555; line-height: 1.4; margin-top: 1.5mm; text-align: center; }
  .kv { width: 100%; border-collapse: collapse; margin-bottom: 1.5mm; }
  .kv th { text-align: left; font-weight: 400; color: #666; width: 26mm; padding: 0.6mm 0; vertical-align: top; }
  .kv td { padding: 0.6mm 0; }
  .note { font-size: 8pt; color: #555; line-height: 1.45; }
  .personal { background: #FBF7F1; border-color: #D9C8B2; margin-bottom: 3mm; display: grid; grid-template-columns: auto 1fr 1.25fr; gap: 1mm 6mm; align-items: center; }
  .personal .boxTitle { margin: 0; white-space: nowrap; }
  .personal .kv { margin: 0; }
  .personal .note { margin: 0; }
  .cond { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin-bottom: 1.5mm; }
  .cond div { padding: 0.8mm 2mm; }
  .cond small { line-height: 1.35; display: block; }
  .cond div { background: #F4EFE9; border-radius: 2px; padding: 1.5mm 2mm; text-align: center; }
  .cond b { display: block; font-size: 10pt; color: #1a1a1a; }
  .cond small { font-size: 7.5pt; color: #666; }
  .steps { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2.5mm; }
  .steps div { border: 1px solid #ddd; border-radius: 2px; padding: 1.5mm 2.5mm; }
  .steps .n { font-size: 7.5pt; font-weight: 700; color: #8B4513; letter-spacing: 0.1em; }
  .steps b { display: block; color: #1a1a1a; margin-bottom: 0.5mm; }
  .steps small { font-size: 8pt; color: #555; line-height: 1.4; display: block; }
  .cta { margin: 2.5mm 0; padding: 2mm 4mm; background: #1F1E1A; color: #fff; border-radius: 2px; display: flex; justify-content: space-between; align-items: center; gap: 4mm; }
  .cta b { font-size: 10.5pt; }
  .cta small { font-size: 8.3pt; color: #ddd; display: block; }
  .foot { border-top: 1px solid #ccc; padding-top: 2mm; margin-top: 1mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.3pt; color: #444; }
  .foot b { color: #1a1a1a; }
  .foot .credit { font-size: 7.5pt; color: #777; }
  .qr { width: 20mm; height: 20mm; }
</style></head><body>
  <div class="top"><span>${dateJa}</span><span>MAKORO（マコロ）｜ 鹿児島シティビューバスガイド 運営</span></div>
  <div class="to">${addressee}</div>
  <h1>外国人のお客様向け「シティビュー停留所案内」<br>卓上POPのご案内</h1>
  <div class="tagline">日英韓繁の4か国語 ・ 現地でGPS確認した全20停留所</div>
  <p class="lead">シティビューバス全20停留所の正確な位置、次のバスまでの時間、ホテルからの道順をスマートフォンで案内する無料サービスです。フロントに卓上POP（A6）を1枚置いていただくだけで、お客様がQRから最寄りの停留所を確認できます。</p>

  <!-- 제품(POP·스마트폰 화면)을 가장 크게 — 담당자가 '무엇을 프런트에 두는지' 한눈에 알아보게 -->
  <div class="main">
    <div class="left">
      <h2>こんなお困りごとはありませんか</h2>
      <div class="box">
        <ul>
          <li>外国人のお客様に「シティビューの乗り場はどこですか」と聞かれる</li>
          <li>Googleマップの停留所表示が実際の乗り場とずれている（天文館は1か所しか表示されず、実際は方面別に2か所）</li>
          <li>帰りに降りる停留所が行きと違うことを、言葉の壁で伝えにくい</li>
        </ul>
      </div>
      <img class="fig" src="${img(resolve(ROOT, 'public/images/home/tenmonkan-map.jpg'))}" alt="">
      <div class="cap">天文館：地図アプリのピン（赤）は1か所。実際の停留所は No.3・No.19 で、ピンから86m・74m離れています（${audit.auditedAt} 調査）。</div>
    </div>
    <div class="right">
      <h2>フロントに置く卓上POPと、QRを読んだ画面</h2>
      <div class="shots">
        <figure><img src="${shots.pop}" alt=""><figcaption>卓上POP（A6・施設名入り${THEME_QS ? '・貴館のイメージに合わせた配色例' : ''}）</figcaption></figure>
        <figure><img src="${shots.phone}" alt=""><figcaption>QRを読んだ画面（道順・乗る／降りる停留所・次のバス）</figcaption></figure>
      </div>
    </div>
  </div>

  ${personal}

  <div class="feat">
    <div><b>① 現地でGPS確認した20停留所</b><small>${verifiedAt}に全停留所を歩いて確認。Googleマップでは${audit.stops.length}か所中${offCount}か所が50m以上ずれていました（最大${worst.errorMeters}m）。</small></div>
    <div><b>② ホテルから乗り場までを案内</b><small>施設ごとの専用QRで、道順・乗る停留所・帰りに降りる停留所・次のバスまでの時間を表示します。</small></div>
    <div><b>③ 貴館のイメージに合わせて</b><small>POP・ポスターの色やデザインは貴館のイメージカラーに合わせてお作りします。日英韓繁の4言語、アプリ不要です。</small></div>
  </div>

  <h2>ご利用条件</h2>
  <div class="cond">
    <div><b>無料</b><small>費用は一切かかりません</small></div>
    <div><b>広告なし</b><small>画面にも印刷物にも広告はありません</small></div>
    <div><b>契約・申込不要</b><small>POPを置くだけ。やめたいときは外すだけ</small></div>
    <div><b>公式データ</b><small>鹿児島市オープンデータ（CC BY 4.0）を加工</small></div>
  </div>
  <p class="note" style="margin-bottom:3mm">無料の理由：鹿児島市観光課による公式採用を目指しており、宿泊施設様でのご利用実績を積み重ねるためです。設置後は、個人を特定しない利用状況（QRの読み取り数など）を月1回ご報告します。</p>

  <h2>ご設置までの流れ</h2>
  <div class="steps">
    <div><span class="n">STEP 1</span><b>一言ご返信</b><small>「送ってください」で結構です。</small></div>
    <div><span class="n">STEP 2</span><b>PDFをお送りします</b><small>卓上POP（A6）とポスター（A4）。ご希望なら印刷したものを郵送します。</small></div>
    <div><span class="n">STEP 3</span><b>フロントに置くだけ</b><small>カードスタンドに立てていただければ完了。1か月後に利用状況をご報告します。</small></div>
  </div>

  <div class="cta">
    <div><b>ご関心をお持ちいただけましたら、son@makoro.dev までご返信いただけますと幸いです。</b><small>置くかどうか、置く場所は貴館のご判断にお任せします。</small></div>
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
  for (const scale of [0.95, 0.93, 0.91, 0.89, 0.87]) {
    const buf = await pdf.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, scale })
    if ((buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length === 1) { writeFileSync(out, buf); used = scale; break }
  }
  if (!used) throw new Error(`${key}: 한 장에 들어가지 않습니다`)
  await pdf.close()
  console.log('pdf', out.replace(ROOT + '/', ''), `(${(readFileSync(out).length / 1024).toFixed(0)} KB, 1 page, scale ${used})`)
}
await b.close()
