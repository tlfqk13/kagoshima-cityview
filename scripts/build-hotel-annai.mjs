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
  const strip = n => n.replace(/（.*?）/g, '')
  const stopsBox = h
    ? `<div class="route">
        <div class="rt"><span class="lab">乗る停留所</span><b><i>No.${hs.board.number}</i>${strip(hs.board.name.ja)}</b><span class="walk">貴館から徒歩約${hs.boardMin}分</span></div>
        <div class="arrow"><svg viewBox="0 0 60 16"><path d="M0 8h52M46 2l8 6-8 6" fill="none" stroke="#8B4513" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>1周 約80分</span></div>
        <div class="rt"><span class="lab">帰りに降りる停留所</span><b><i>No.${hs.alight.number}</i>${strip(hs.alight.name.ja)}</b><span class="walk">貴館まで徒歩約${hs.alightMin}分</span></div>
      </div>`
    : `<div class="route"><div class="rt"><span class="lab">施設ごとの専用QR</span><b>乗る停留所・帰りに降りる停留所</b><span class="walk">施設の位置に合わせてご案内します</span></div></div>`
  const previewUrl = h ? `${BASE}/map?hotel=${h.slug}` : `${BASE}/map`
  const sec = (n, ja, en) => `<div class="sec"><span class="n">${n}</span><h2>${ja}</h2><span class="en">${en}</span><i></i></div>`
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>シティビュー停留所案内 卓上POPのご案内</title>
<style>
  /* 서비스 안내서 — 머리띠 / 제목 / 번호 섹션 4개 / 문의 / 바닥띠. 색은 가고시마 서비스의 먹색·갈색·종이색 */
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; }
  .page { width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .pno { position: absolute; right: 15mm; bottom: 7mm; font: 400 7.5pt 'Helvetica Neue', Arial, sans-serif; letter-spacing: 0.1em; color: #A89A88; }
  .band.sm { padding: 3.5mm 15mm; }
  .p2 .tail { position: absolute; left: 0; right: 0; bottom: 0; }
  .faq { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm 5mm; }
  .faq div { border: 1px solid #E8DFD2; border-radius: 1.5mm; padding: 3.2mm 4mm; }
  .faq b { display: block; font-size: 9.8pt; line-height: 1.5; padding-left: 6mm; position: relative; }
  .faq b::before { content: "Q"; position: absolute; left: 0; top: 0; color: #8B4513; font: 700 10.5pt/1.45 'Helvetica Neue', Arial, sans-serif; }
  .faq p { font-size: 8.9pt; line-height: 1.65; padding-left: 6mm; position: relative; margin-top: 1mm; }
  .faq p::before { content: "A"; position: absolute; left: 0; top: 0; color: #A89A88; font: 700 10.5pt/1.4 'Helvetica Neue', Arial, sans-serif; }
  body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic', Meiryo, sans-serif; font-size: 9.4pt; line-height: 1.65; color: #3a3632; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  b { color: #1F1E1A; }
  .band { background: #1F1E1A; color: #fff; padding: 5mm 15mm; display: flex; justify-content: space-between; align-items: center; }
  .band .svc { font-size: 10pt; font-weight: 700; letter-spacing: 0.08em; }
  .band .svc small { font-weight: 400; font-size: 8pt; letter-spacing: 0.16em; color: #D9C8B2; margin-left: 3mm; }
  .band .meta { font-size: 8pt; color: #D9C8B2; letter-spacing: 0.06em; }
  .head { background: #F4EFE9; padding: 7mm 15mm 7mm; border-bottom: 1.2mm solid #8B4513; }
  .to { font-size: 10.5pt; color: #1F1E1A; margin-bottom: 3mm; }
  .to span { font-size: 8.6pt; color: #6E675E; margin-left: 2mm; }
  h1 { font-size: 18pt; line-height: 1.35; color: #1F1E1A; letter-spacing: 0.02em; }
  h1 small { display: block; font-size: 9pt; font-weight: 700; color: #8B4513; letter-spacing: 0.22em; margin-bottom: 1.5mm; }
  .lead { margin-top: 3mm; font-size: 10pt; line-height: 1.7; max-width: 165mm; }
  .lead b { white-space: nowrap; }
  .body { padding: 9mm 15mm 0; }
  .sec { display: flex; align-items: center; gap: 3mm; margin: 0 0 3.5mm; }
  .sec .n { flex-shrink: 0; width: 7.5mm; height: 7.5mm; background: #8B4513; color: #fff; font: 700 9.5pt/7.5mm 'Helvetica Neue', Arial, sans-serif; text-align: center; border-radius: 1mm; letter-spacing: 0; }
  .sec h2 { font-size: 12pt; color: #1F1E1A; letter-spacing: 0.04em; line-height: 1.2; white-space: nowrap; }
  .sec .en { font: 400 7.2pt 'Helvetica Neue', Arial, sans-serif; letter-spacing: 0.22em; color: #A89A88; white-space: nowrap; }
  .sec i { flex: 1; height: 1px; background: #D9C8B2; }
  section { margin-bottom: 9mm; }
  /* 01 */
  .s1 { display: grid; grid-template-columns: 100mm 1fr; gap: 8mm; align-items: center; }
  .shots { display: grid; grid-template-columns: 57mm 39mm; gap: 4mm; align-items: end; }
  .shots figure { margin: 0; } .shots img { width: 100%; display: block; border: 1px solid #C9BFB2; border-radius: 1mm; }
  .shots figcaption { font-size: 7.6pt; color: #6E675E; line-height: 1.4; margin-top: 1.5mm; text-align: center; }
  .flow { display: flex; flex-direction: column; gap: 4mm; }
  .flow .f { display: grid; grid-template-columns: 9mm 1fr; gap: 3mm; align-items: start; background: #FBF8F3; border: 1px solid #E8DFD2; border-radius: 1.5mm; padding: 4mm 4mm; }
  .flow .f .k { width: 9mm; height: 9mm; border-radius: 50%; border: 1.5px solid #8B4513; color: #8B4513; font: 700 10pt/8.4mm 'Helvetica Neue', Arial, sans-serif; text-align: center; }
  .flow .f b { display: block; font-size: 10.4pt; line-height: 1.4; }
  .flow .f span { display: block; font-size: 8.8pt; color: #5A534B; line-height: 1.55; }
  /* 02 */
  .route { display: grid; grid-template-columns: 1fr auto 1fr; gap: 5mm; align-items: center; background: #FBF8F3; border: 1px solid #D9C8B2; border-left: 1.6mm solid #8B4513; border-radius: 1.5mm; padding: 6mm 7mm; }
  .rt { display: flex; flex-direction: column; gap: 0.8mm; }
  .rt .lab { font-size: 8pt; color: #8B4513; font-weight: 700; letter-spacing: 0.1em; }
  .rt b { font-size: 15pt; line-height: 1.35; }
  .rt b i { font: 700 10pt 'Helvetica Neue', Arial, sans-serif; font-style: normal; background: #1F1E1A; color: #fff; padding: 0.6mm 2mm; border-radius: 1mm; margin-right: 2mm; vertical-align: 1px; }
  .rt .walk { font-size: 8.8pt; color: #5A534B; }
  .arrow { display: flex; flex-direction: column; align-items: center; gap: 1mm; }
  .arrow svg { width: 16mm; } .arrow span { font-size: 7.4pt; color: #8A7F72; white-space: nowrap; }
  .chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-top: 4mm; }
  .chips div { border: 1px solid #E8DFD2; border-radius: 1.5mm; padding: 2.4mm 3mm; font-size: 8.8pt; line-height: 1.5; }
  .chips b { display: block; font-size: 9.6pt; }
  /* 03 */
  .s3 { display: grid; grid-template-columns: 82mm 1fr; gap: 7mm; align-items: center; }
  .s3 .stat { margin-top: 3.5mm; display: grid; grid-template-columns: auto 1fr; gap: 4mm; align-items: center; text-align: left; padding: 3.5mm 5mm; }
  .s3 .stat span { margin: 0; }
  .figwrap { height: 53mm; overflow: hidden; border: 1px solid #C9BFB2; border-radius: 1mm; }
  .fig { width: 100%; height: 100%; object-fit: cover; object-position: 50% 45%; display: block; }
  .s3 p { font-size: 9.2pt; line-height: 1.7; } .s3 p + p { margin-top: 1.5mm; }
  .stat { text-align: center; background: #1F1E1A; color: #fff; border-radius: 1.5mm; padding: 4mm 2mm; }
  .stat b { display: block; color: #fff; font: 700 24pt/1 'Helvetica Neue', Arial, sans-serif; } .stat b small { font-size: 12pt; color: #D9C8B2; font-weight: 400; }
  .stat span { display: block; font-size: 7.6pt; color: #D9C8B2; line-height: 1.45; margin-top: 1.5mm; }
  /* 04 */
  .cond { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
  .cond div { background: #F4EFE9; border-radius: 1.5mm; padding: 4.5mm 2mm; text-align: center; border-top: 0.8mm solid #8B4513; }
  .cond b { display: block; font-size: 12pt; line-height: 1.4; } .cond small { font-size: 8.2pt; color: #5A534B; display: block; line-height: 1.4; }
  .note { font-size: 8.2pt; color: #6E675E; line-height: 1.6; margin-top: 2mm; }
  /* 문의 */
  .contact { margin: 0 15mm 8mm; display: grid; grid-template-columns: 1fr auto; gap: 6mm; align-items: center; border: 1.5px solid #1F1E1A; border-radius: 2mm; padding: 4.5mm 6mm; }
  .contact .t { font-size: 8pt; font-weight: 700; color: #8B4513; letter-spacing: 0.2em; }
  .contact .m { font: 700 15pt/1.4 'Helvetica Neue', Arial, sans-serif; color: #1F1E1A; letter-spacing: 0.02em; }
  .contact p { font-size: 8.8pt; line-height: 1.6; color: #3a3632; }
  .qr { width: 22mm; height: 22mm; display: block; }
  .foot { margin-top: 0; background: #F4EFE9; border-top: 1px solid #D9C8B2; padding: 3.5mm 15mm 4.5mm; font-size: 8pt; color: #5A534B; line-height: 1.6; display: flex; justify-content: space-between; gap: 6mm; }
  .foot b { font-size: 9pt; } .foot .credit { color: #8A7F72; font-size: 7.4pt; text-align: right; }
</style></head><body>
<div class="page p1">
  <div class="band"><span class="svc">鹿児島シティビューバスガイド<small>サービスご案内</small></span><span class="meta">${dateJa}　MAKORO（マコロ）</span></div>

  <div class="head">
    <p class="to">${h ? h.nameJa + ' 様' : '宿泊施設 ご担当者様'}${h ? '<span>フロントご担当者様</span>' : ''}</p>
    <h1><small>外国人のお客様向け</small>シティビュー停留所案内 卓上POPのご案内</h1>
    <p class="lead">フロントに卓上POP（A6）を1枚置いていただくと、外国人のお客様がQRを読むだけで、<b>ホテルから乗り場までの道順</b>と<b>次のバスまでの時間</b>を、ご自身の言語で確認できます。</p>
  </div>

  <div class="body">
    <section>
      ${sec('01', 'サービスの内容', 'HOW IT WORKS')}
      <div class="s1">
        <div class="shots">
          <figure><img src="${shots.pop}" alt=""><figcaption>卓上POP（A6・施設名入り）${THEME_QS ? '<br>貴館のイメージに合わせた配色例' : ''}</figcaption></figure>
          <figure><img src="${shots.phone}" alt=""><figcaption>QRを読んだ画面</figcaption></figure>
        </div>
        <div class="flow">
          <div class="f"><span class="k">1</span><div><b>フロントにPOPを置く</b><span>カードスタンドに立てるだけ。PDFをお送りするか、印刷して郵送します。</span></div></div>
          <div class="f"><span class="k">2</span><div><b>お客様がQRを読む</b><span>アプリのインストールは不要。日本語・英語・韓国語・繁体字中国語に対応。</span></div></div>
          <div class="f"><span class="k">3</span><div><b>乗り場と次のバスが表示される</b><span>貴館からの道順、乗る停留所、帰りに降りる停留所、次のバスまでの時間。</span></div></div>
        </div>
      </div>
    </section>

    <section>
      ${sec('02', h ? h.nameJa + ' 様の場合' : '施設ごとのご案内', 'FOR YOUR HOTEL')}
      ${stopsBox}
      <div class="chips">
        <div><b>行きと帰りの両方を案内</b>一方向の循環路線のため、乗る・降りる停留所が異なる場合があります。</div>
        <div><b>貴館に合わせたデザイン</b>POP・ポスターの色やデザインを、貴館のイメージに合わせます。</div>
        <div><b>月1回のご報告</b>QRの読み取り数など、個人を特定しない利用状況をお知らせします。</div>
      </div>
    </section>

  </div>
  <span class="pno">1 / 2</span>
</div>

<div class="page p2">
  <div class="band sm"><span class="svc">鹿児島シティビューバスガイド<small>サービスご案内</small></span><span class="meta">${h ? h.nameJa + ' 様' : ''}</span></div>
  <div class="body">
    <section>
      ${sec('03', 'なぜ必要か', 'WHY IT MATTERS')}
      <div class="s3">
        <div class="figwrap"><img class="fig" src="${img(resolve(ROOT, 'public/images/home/tenmonkan-map.jpg'))}" alt=""></div>
        <div>
          <p>Googleマップでは、天文館の停留所は<b>1か所</b>（赤いピン）しか表示されません。実際の乗り場は方面別に<b>2か所</b>（No.3・No.19）あり、ピンから86m・74m離れています。</p>
          <p>そこで全停留所を現地で歩いて確認し（${verifiedAt}）、正確な位置を地図にしました。</p>
          <div class="stat"><b>${offCount}<small>/${audit.stops.length}</small></b><span>全${audit.stops.length}停留所のうち${offCount}か所で、Googleマップの表示が50m以上ずれていました（${audit.auditedAt} 調査・最大${worst.errorMeters}m）</span></div>
        </div>
      </div>
    </section>

    <section>
      ${sec('04', 'ご利用条件', 'TERMS')}
      <div class="cond">
        <div><b>無料</b><small>費用は一切かかりません</small></div>
        <div><b>広告なし</b><small>画面にも印刷物にもありません</small></div>
        <div><b>契約・申込不要</b><small>置くだけ。やめるときは外すだけ</small></div>
      </div>
      <p class="note">無料でご提供する理由：鹿児島市観光課による公式採用を目指しており、宿泊施設様でのご利用実績を積み重ねるためです。置くかどうか、置く場所は貴館のご判断にお任せします。</p>
    </section>

    <section>
      ${sec('05', 'よくあるご質問', 'FAQ')}
      <div class="faq">
        <div><b>本当に費用はかかりませんか。</b><p>かかりません。広告の掲載や、有料プランへのご案内もありません。</p></div>
        <div><b>時刻表や停留所が変わったら？</b><p>鹿児島市の公式データの改定に合わせて、当方で更新します。POPのQRはそのままお使いいただけます。</p></div>
        <div><b>どの言語に対応していますか。</b><p>日本語・英語・韓国語・繁体字中国語です。お客様の端末の言語に合わせて表示されます。</p></div>
        <div><b>やめたいときは？</b><p>POPを外していただくだけです。ご連絡やお手続きは必要ありません。</p></div>
      </div>
    </section>
  </div>

  <div class="tail">

  <div class="contact">
    <div>
      <p class="t">お問い合わせ・お申し込み</p>
      <p class="m">son@makoro.dev</p>
      <p>ご関心をお持ちいただけましたら、一言ご返信ください。POPとポスターのPDFをお送りします。<br>表示例：${previewUrl}</p>
    </div>
    <img class="qr" src="${shots.qr}" alt="">
  </div>

  <div class="foot">
    <div><b>MAKORO（マコロ）</b>　担当：${CONTACT_NAME}　｜　https://makoro.dev<br>所在地：${ADDRESS}</div>
    <div class="credit">データ提供：鹿児島市（原データより加工）<br>停留所位置は${verifiedAt}に現地確認　｜　2 / 2</div>
  </div>
  </div>
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
  const over = await pdf.evaluate(() => [...document.querySelectorAll('.page')].map(pg => { const tail = pg.querySelector('.tail'); const limit = tail ? tail.getBoundingClientRect().top : pg.getBoundingClientRect().bottom - 30; const last = pg.querySelector('.body > section:last-of-type'); return Math.round(last.getBoundingClientRect().bottom - limit) }))
  if (over.some(v => v > 0)) throw new Error(`${key}: 쪽 안에서 내용이 넘칩니다 ${JSON.stringify(over)}`)
  const buf = await pdf.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
  const used = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
  if (used !== 2) throw new Error(`${key}: ${used}쪽 (2쪽이어야 함)`)
  writeFileSync(out, buf)
  await pdf.close()
  console.log('pdf', out.replace(ROOT + '/', ''), `(${(readFileSync(out).length / 1024).toFixed(0)} KB, ${used} pages, 여백 ${JSON.stringify(over.map(v => -v))}px)`)
}
await b.close()
