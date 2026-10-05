// 호텔별 A4 2쪽 「ご案内」(첫 연락 메일 첨부용) 생성기.
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
  const strip = n => n.replace(/（.*?）/g, '')
  const previewUrl = h ? `${BASE}/map?hotel=${h.slug}` : `${BASE}/map`
  const top = `<div class="top"><span>鹿児島シティビューバスガイド　サービスご案内</span><span>${dateJa}</span></div>`
  const stopsTable = h
    ? `<table class="t">
        <tr><th>乗る停留所</th><td><b class="big">No.${hs.board.number}　${strip(hs.board.name.ja)}</b></td><td class="r">貴館から徒歩約${hs.boardMin}分</td></tr>
        <tr><th>帰りに降りる停留所</th><td><b class="big">No.${hs.alight.number}　${strip(hs.alight.name.ja)}</b></td><td class="r">貴館まで徒歩約${hs.alightMin}分</td></tr>
        <tr><th>所要時間</th><td colspan="2">1周 約80分（一方向の循環路線）</td></tr>
      </table>`
    : `<table class="t"><tr><th>施設ごとの専用QR</th><td>乗る停留所・帰りに降りる停留所を、施設の位置に合わせてご案内します</td></tr></table>`
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>シティビュー停留所案内 卓上POPのご案内</title>
<style>
  /* 일본 비즈니스 문서 양식 — 宛名·발신인·표題 / 번호 見出し / 괘선 표. 색은 먹색 + 남색 하나, 둥근 모서리·카드·영문 장식 없음 */
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; }
  body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic', Meiryo, sans-serif; font-size: 9.6pt; line-height: 1.7; color: #222; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; height: 297mm; position: relative; overflow: hidden; padding: 13mm 18mm 0; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .top { display: flex; justify-content: space-between; font-size: 8pt; color: #555; padding-bottom: 1.8mm; border-bottom: 0.7mm solid #1D3C6E; }
  .pno { position: absolute; left: 0; right: 0; bottom: 8mm; text-align: center; font-size: 8pt; color: #777; }

  .addr { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 6mm; }
  .to { font-size: 12.5pt; font-weight: 700; line-height: 1.6; color: #111; }
  .to span { display: block; font-size: 10.5pt; font-weight: 400; }
  .from { font-size: 8.8pt; line-height: 1.65; text-align: left; }
  .from b { font-size: 10pt; }
  h1 { margin-top: 6mm; padding: 3.5mm 0; text-align: center; font-size: 17pt; line-height: 1.45; letter-spacing: 0.04em; color: #111; border-top: 0.35mm solid #222; border-bottom: 0.35mm solid #222; }
  h1 small { display: block; font-size: 10pt; font-weight: 400; letter-spacing: 0.1em; }
  .lead { margin-top: 4.5mm; font-size: 10pt; line-height: 1.85; }
  .lead b { white-space: nowrap; }

  .body { margin-top: 6.5mm; }
  .p2 .body { margin-top: 6.5mm; }
  .p2 section { margin-bottom: 5.5mm; }
  section { margin-bottom: 6.5mm; }
  h2 { font-size: 12pt; line-height: 1.4; color: #111; padding: 0.6mm 0 1.6mm 3.2mm; border-left: 1.8mm solid #1D3C6E; border-bottom: 0.3mm solid #1D3C6E; margin-bottom: 3.5mm; }
  h2 span { margin-right: 3mm; color: #1D3C6E; }

  .s1 { display: grid; grid-template-columns: 90mm 1fr; gap: 9mm; align-items: start; }
  /* 두 그림은 높이를 똑같이 맞춘다(위·아래 선 일치). 폭은 각 캡처 비율(397:560, 390:700)에서 계산 */
  .shots { display: grid; grid-template-columns: 48.2mm 37.9mm; gap: 4mm; align-items: start; }
  .shots figure { margin: 0; } .shots img { width: 100%; height: 68mm; object-fit: cover; object-position: top; display: block; border: 0.25mm solid #999; }
  figcaption { margin-top: 1.5mm; font-size: 8pt; line-height: 1.5; color: #444; text-align: center; }
  .steps { list-style: none; height: 68mm; display: flex; flex-direction: column; justify-content: space-between; }
  .steps li { padding: 0; line-height: 1.6; }
  .steps li:first-child { margin-top: -0.6mm; }
  .steps li:last-child { margin-bottom: -1mm; }
  .steps li + li { border-top: 0.25mm dotted #888; padding-top: 3mm; }
  .steps b { white-space: nowrap; }
  .steps .k { display: inline-block; background: #1D3C6E; color: #fff; font-size: 8pt; font-weight: 700; letter-spacing: 0.08em; padding: 0.3mm 2.4mm; margin-right: 2.5mm; vertical-align: 0.3mm; }
  .steps b { font-size: 11pt; color: #111; }
  .steps p { margin-top: 1.2mm; font-size: 9.2pt; line-height: 1.7; }

  table.t { width: 100%; border-collapse: collapse; font-size: 9.6pt; }
  .t th, .t td { border: 0.25mm solid #8A93A3; padding: 1.5mm 3.5mm; text-align: left; vertical-align: middle; line-height: 1.6; }
  .t th { width: 38mm; background: #EDF0F5; font-weight: 700; color: #111; white-space: nowrap; }
  .t .r { width: 42mm; white-space: nowrap; }
  .t .big { font-size: 12.5pt; color: #111; }
  .t .num { font-size: 13pt; font-weight: 700; color: #1D3C6E; }
  .pts { list-style: none; margin-top: 3mm; }
  .pts li { padding-left: 4.2mm; position: relative; margin-top: 1.4mm; }
  .pts li::before { content: "■"; position: absolute; left: 0; top: 0.9mm; font-size: 5.5pt; color: #1D3C6E; }
  .pts b { color: #111; }

  .s3 { display: grid; grid-template-columns: 68mm 1fr; gap: 7mm; align-items: stretch; }
  .s3 figure { display: flex; flex-direction: column; }
  .s3 figcaption, .s3 .note { margin-top: 1.5mm; font-size: 8pt; line-height: 1.5; }
  .figwrap { flex: 1; min-height: 40mm; overflow: hidden; border: 0.25mm solid #999; }
  .fig { width: 100%; height: 100%; object-fit: cover; object-position: 50% 45%; display: block; }
  .s3 p + p { margin-top: 1.5mm; }
  .s3 table { margin-top: 2.5mm; }
  .s3 .t th { width: 44mm; }
  .note { margin-top: 2mm; font-size: 8.4pt; color: #444; }

  .faq { display: grid; grid-template-columns: 1fr 1fr; gap: 0 8mm; }
  .faq div { padding: 2.2mm 0; border-bottom: 0.25mm dotted #888; }
  .faq div:nth-child(-n+2) { padding-top: 0; }
  .faq dt { font-weight: 700; color: #111; padding-left: 6mm; position: relative; }
  .faq dd { padding-left: 6mm; position: relative; font-size: 9.2pt; }
  .faq dt::before { content: "Q."; position: absolute; left: 0; color: #1D3C6E; }
  .faq dd::before { content: "A."; position: absolute; left: 0; font-weight: 700; color: #777; }

  .tail { position: absolute; left: 18mm; right: 18mm; bottom: 13mm; }
  .contact { display: grid; grid-template-columns: 1fr 22mm; gap: 5mm; align-items: center; }
  .contact .t th { width: 30mm; }
  .contact .mail { font-size: 12.5pt; font-weight: 700; color: #111; }
  .qr { width: 22mm; height: 22mm; display: block; }
  .credit { margin-top: 2.5mm; font-size: 7.8pt; line-height: 1.6; color: #555; }
</style></head><body>
<div class="page p1">
  ${top}
  <div class="addr">
    <p class="to">${h ? h.nameJa : '宿泊施設'}<span>${h ? 'フロントご担当者様' : 'ご担当者様'}</span></p>
    <p class="from"><b>MAKORO（マコロ）</b><br>担当：${CONTACT_NAME}<br>son@makoro.dev</p>
  </div>
  <h1><small>外国人のお客様向け</small>シティビュー停留所案内 卓上POPのご案内</h1>
  <p class="lead">フロントに卓上POP（A6）を1枚置いていただくと、外国人のお客様がQRを読むだけで、<b>ホテルから乗り場までの道順</b>と<b>次のバスまでの時間</b>を、ご自身の言語で確認できます。</p>

  <div class="body">
    <section>
      <h2><span>1</span>サービスの内容</h2>
      <div class="s1">
        <div class="shots">
          <figure><img src="${shots.pop}" alt=""><figcaption>図1　卓上POP（A6・施設名入り）${THEME_QS ? '<br>貴館のイメージに合わせた配色例' : ''}</figcaption></figure>
          <figure><img src="${shots.phone}" alt=""><figcaption>図2　QRを読んだ画面</figcaption></figure>
        </div>
        <ol class="steps">
          <li><span class="k">STEP 1</span><b>フロントにPOPを置く</b><p>カードスタンドに立てるだけです。PDFをお送りするか、印刷して郵送します。</p></li>
          <li><span class="k">STEP 2</span><b>お客様がQRを読む</b><p>アプリのインストールは不要です。日本語・英語・韓国語・繁体字中国語に対応しています。</p></li>
          <li><span class="k">STEP 3</span><b>乗り場と次のバスが表示される</b><p>貴館からの道順、乗る停留所、帰りに降りる停留所、次のバスまでの時間を表示します。</p></li>
        </ol>
      </div>
    </section>

    <section>
      <h2><span>2</span>${h ? h.nameJa + ' 様でのご案内内容' : '施設ごとのご案内内容'}</h2>
      ${stopsTable}
      <ul class="pts">
        <li><b>行きと帰りの両方をご案内します。</b>一方向の循環路線のため、乗る停留所と降りる停留所が異なる場合があります。</li>
        <li><b>貴館に合わせたデザインでお作りします。</b>POP・ポスターの色やデザインを、貴館のイメージに合わせます。</li>
        <li><b>月1回、ご利用状況をご報告します。</b>QRの読み取り数など、個人を特定しない数値のみをお知らせします。</li>
      </ul>
    </section>
  </div>
  <span class="pno">1 / 2</span>
</div>

<div class="page p2">
  ${top}
  <div class="body">
    <section>
      <h2><span>3</span>背景（なぜ必要か）</h2>
      <div class="s3">
        <figure><div class="figwrap"><img class="fig" src="${img(resolve(ROOT, 'public/images/home/tenmonkan-map.jpg'))}" alt=""></div><figcaption>図3　天文館（赤：Googleマップの表示）</figcaption></figure>
        <div>
          <p>Googleマップでは、天文館の停留所は1か所（赤いピン）しか表示されません。実際の乗り場は方面別に2か所（No.3・No.19）あり、ピンから86m・74m離れています。</p>
          <p>そこで全停留所を現地で歩いて確認し（${verifiedAt}）、正確な位置を地図にしました。</p>
          <table class="t">
            <tr><th>50m以上ずれている停留所</th><td><span class="num">${offCount}</span> か所 ／ 全${audit.stops.length}か所</td></tr>
            <tr><th>最大のずれ</th><td><span class="num">${worst.errorMeters}</span> m</td></tr>
          </table>
          <p class="note">※ Googleマップの表示との比較（${audit.auditedAt} 調査）</p>
        </div>
      </div>
    </section>

    <section>
      <h2><span>4</span>ご利用条件</h2>
      <table class="t">
        <tr><th>費用</th><td>無料（費用は一切かかりません）</td></tr>
        <tr><th>広告</th><td>なし（画面にも印刷物にもありません）</td></tr>
        <tr><th>契約・お申し込み</th><td>不要（置くだけで始められ、やめるときは外すだけです）</td></tr>
      </table>
      <p class="note">※ 無料でご提供する理由：鹿児島市観光課による公式採用を目指しており、宿泊施設様でのご利用実績を積み重ねるためです。<br>※ 置くかどうか、置く場所は貴館のご判断にお任せします。</p>
    </section>

    <section>
      <h2><span>5</span>よくあるご質問</h2>
      <dl class="faq">
        <div><dt>本当に費用はかかりませんか。</dt><dd>かかりません。広告の掲載や、有料プランへのご案内もありません。</dd></div>
        <div><dt>時刻表や停留所が変わった場合は？</dt><dd>鹿児島市の公式データの改定に合わせて、当方で更新します。POPのQRはそのままお使いいただけます。</dd></div>
        <div><dt>どの言語に対応していますか。</dt><dd>日本語・英語・韓国語・繁体字中国語です。お客様の端末の言語に合わせて表示されます。</dd></div>
        <div><dt>やめたいときは？</dt><dd>POPを外していただくだけです。ご連絡やお手続きは必要ありません。</dd></div>
      </dl>
    </section>
  </div>

  <div class="tail">
    <h2>お問い合わせ・お申し込み</h2>
    <div class="contact">
      <table class="t">
        <tr><th>メール</th><td><span class="mail">son@makoro.dev</span>　（担当：${CONTACT_NAME}）</td></tr>
        <tr><th>お申し込み方法</th><td>一言ご返信ください。POPとポスターのPDFをお送りします。<br><span style="white-space:nowrap;font-size:8.8pt">表示例：${previewUrl}</span></td></tr>
      </table>
      <img class="qr" src="${shots.qr}" alt="">
    </div>
    <p class="credit">運営：MAKORO（マコロ）　https://makoro.dev<br>所在地：${ADDRESS}<br>データ提供：鹿児島市（原データより加工）　／　停留所位置は${verifiedAt}に現地確認</p>
  </div>
  <span class="pno">2 / 2</span>
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
  // 앞뒤 2쪽 고정. 각 쪽 안에서 내용이 넘치면(잘리면) 실패로 처리한다
  const over = await pdf.evaluate(() => [...document.querySelectorAll('.page')].map(pg => { const tail = pg.querySelector('.tail'); const limit = tail ? tail.getBoundingClientRect().top - 15 : pg.querySelector('.pno').getBoundingClientRect().top - 15; const last = pg.querySelector('.body > section:last-of-type'); return Math.round(last.getBoundingClientRect().bottom - limit) }))
  const shotEdges = await pdf.evaluate(() => [...document.querySelectorAll('.shots img')].map(i => { const r = i.getBoundingClientRect(); return [r.top, r.bottom] }))
  if (Math.abs(shotEdges[0][0] - shotEdges[1][0]) > 0.5 || Math.abs(shotEdges[0][1] - shotEdges[1][1]) > 0.5) throw new Error(`${key}: 그림 위·아래 선이 맞지 않습니다 ${JSON.stringify(shotEdges)}`)
  // 균형 검사: STEP 열과 그림의 위·아래, 3번 섹션 좌우 열의 아래 선
  const bal = await pdf.evaluate(() => {
    const r = sel => document.querySelector(sel).getBoundingClientRect()
    const img = r('.shots img'), k = r('.steps li:first-child .k'), last = r('.steps li:last-child p')
    return { stepTop: k.top - img.top, stepBottom: last.bottom - img.bottom - 4 /* 마지막 줄의 행간 여백만큼은 글자 아래가 비어 있다 */, s3Bottom: r('.s3 figcaption').bottom - r('.s3 .note').bottom }
  })
  if (Object.values(bal).some(v => Math.abs(v) > 3)) throw new Error(`${key}: 좌우 균형이 맞지 않습니다 ${JSON.stringify(bal)}`)
  if (over.some(v => v > 0)) throw new Error(`${key}: 쪽 안에서 내용이 넘칩니다 ${JSON.stringify(over)}`)
  const buf = await pdf.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
  const used = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
  if (used !== 2) throw new Error(`${key}: ${used}쪽 (2쪽이어야 함)`)
  writeFileSync(out, buf)
  await pdf.close()
  console.log('pdf', out.replace(ROOT + '/', ''), `(${(readFileSync(out).length / 1024).toFixed(0)} KB, ${used} pages, 여백 ${JSON.stringify(over.map(v => -v))}px)`)
}
await b.close()
