// 회사 사이트(sites/makoro) 배포 전 점검: ① 버튼형 요소의 글자 세로 중앙 ② 글자가 자기 상자(둥근 모서리 포함) 밖으로 나가는지
//   node scripts/audit-company-site.mjs [--shots <dir>]
// 사장님 기준: 버튼 안 글자가 가운데가 아니거나, 요소 밖으로 글자가 튀어나오는 것은 0건이어야 한다.
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'
const root = join(process.cwd(), 'sites/makoro')
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null
if (shots) mkdirSync(shots, { recursive: true })
const types = { '.html': 'text/html', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
const srv = createServer((req, res) => { const u = req.url.split('?')[0]; const f = join(root, u === '/' ? 'index.html' : u); if (!existsSync(f)) { res.statusCode = 404; return res.end() } res.setHeader('content-type', types[extname(f)] || 'application/octet-stream'); res.end(readFileSync(f)) }).listen(3997)
const CENTER = `(() => { const out = []
  for (const el of document.querySelectorAll('.btn, .pill, .jtag, .lang button, .fix a')) {
    const r = el.getBoundingClientRect(); if (r.width < 16 || r.height < 12) continue
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const range = document.createRange(); range.selectNodeContents(el)
    const rects = [...range.getClientRects()].filter(x => x.width > 0 && x.height > 0); if (!rects.length) continue
    const vertical = cs.writingMode.startsWith('vertical')
    const a = vertical ? Math.min(...rects.map(x => x.left)) : Math.min(...rects.map(x => x.top)), b = vertical ? Math.max(...rects.map(x => x.right)) : Math.max(...rects.map(x => x.bottom))
    const d = (a + b) / 2 - (vertical ? r.left + r.width / 2 : r.top + r.height / 2)
    if (Math.abs(d) > 1.5) out.push({ text: (el.innerText || '').trim().slice(0, 24), off: +d.toFixed(1), cls: el.className })
  } return out })()`
const OVERFLOW = `(() => { const out = []
  const boxes = [...document.querySelectorAll('*')].filter(el => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); if (r.width < 40 || r.height < 20) return false; if (['BODY','HTML','MAIN','SECTION','FOOTER','HEADER','NAV'].includes(el.tagName)) return false; if (el.classList.contains('after') || el.classList.contains('hero')) return false; return (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderTopWidth !== '0px' || cs.boxShadow !== 'none') })
  function inside(box, x, y) { const r = box.getBoundingClientRect(), rad = getComputedStyle(box).borderRadius
    if (x < r.left - 0.5 || x > r.right + 0.5 || y < r.top - 0.5 || y > r.bottom + 0.5) return false
    if (rad === '50%') { const cx = r.left + r.width / 2, cy = r.top + r.height / 2; return ((x - cx) / (r.width / 2)) ** 2 + ((y - cy) / (r.height / 2)) ** 2 <= 1.0 }
    if (rad.includes('%')) { const [h, v] = rad.split('/').map(p => p.trim().split(/\\s+/).map(parseFloat)); const H = [h[0], h[1] ?? h[0], h[2] ?? h[0], h[3] ?? h[1] ?? h[0]], V = v ? [v[0], v[1] ?? v[0], v[2] ?? v[0], v[3] ?? v[1] ?? v[0]] : H
      const cs = [[r.left, r.top, 0], [r.right, r.top, 1], [r.right, r.bottom, 2], [r.left, r.bottom, 3]]
      for (const [x0, y0, i] of cs) { const rx = r.width * H[i] / 100, ry = r.height * V[i] / 100, cx = x0 + (i === 0 || i === 3 ? rx : -rx), cy = y0 + (i < 2 ? ry : -ry); if ((i === 0 || i === 3 ? x < cx : x > cx) && (i < 2 ? y < cy : y > cy) && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) return false } }
    return true }
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n
  while ((n = w.nextNode())) { if (!n.nodeValue.trim()) continue
    const el = n.parentElement, cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue
    if (el.closest('.menu:not(.show)')) continue
    const box = boxes.filter(b => b !== el && b.contains(el)).pop(); if (!box) continue
    const range = document.createRange(); range.selectNodeContents(n)
    for (const rc of range.getClientRects()) { if (!rc.width) continue
      const pts = [[rc.left + 1, rc.top + 1], [rc.right - 1, rc.top + 1], [rc.left + 1, rc.bottom - 1], [rc.right - 1, rc.bottom - 1]]
      if (pts.some(([x, y]) => !inside(box, x, y))) { out.push({ text: n.nodeValue.trim().slice(0, 28), box: (box.className || box.tagName).toString().slice(0, 28) }); break } } }
  // 도넛: 가운데 글자가 고리 안쪽 원(반지름 = (54-7)/132 × 폭) 안에 있어야 한다
  for (const d of document.querySelectorAll('.donut')) { const r = d.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width * 47 / 132 - 1
    const range = document.createRange(); range.selectNodeContents(d.querySelector('.c'))
    for (const rc of range.getClientRects()) { if (!rc.width) continue; if ([[rc.left, rc.top], [rc.right, rc.top], [rc.left, rc.bottom], [rc.right, rc.bottom]].some(([x, y]) => Math.hypot(x - cx, y - cy) > R)) { out.push({ text: 'DONUT TEXT TOUCHES RING', box: 'donut' }); break } } }
  // 사진이 object-fit: cover 로 15% 이상 잘리면 보고(글자가 든 그림이 끊긴다)
  for (const im of document.images) { const cs = getComputedStyle(im); if (cs.objectFit !== 'cover' || !im.naturalWidth) continue; const r = im.getBoundingClientRect(); if (r.width < 120) continue; const a = im.naturalWidth / im.naturalHeight, b = r.width / r.height; const lost = 1 - Math.min(a, b) / Math.max(a, b); if (lost > 0.15) out.push({ text: 'IMAGE CROPPED ' + Math.round(lost * 100) + '%', box: im.getAttribute('src') }) }
  // 고정 요소(.fix)가 본문 폭(.wrap) 안쪽을 가리면 보고
  const fx = document.querySelector('.fix'), wr = document.querySelector('section .wrap')
  if (fx && wr && getComputedStyle(fx).display !== 'none') { const f = fx.getBoundingClientRect(), w = wr.getBoundingClientRect(); if (f.left < w.right - 20) out.push({ text: 'FIXED CTA OVERLAPS CONTENT', box: Math.round(w.right - f.left) + 'px' }) }
  // 히어로를 지난 뒤 헤더에 바탕이 있어야 한다(로고가 본문 글자와 겹쳐 보이지 않게)
  const hd = document.querySelector('.hd'); if (hd && hd.classList.contains('on-light') && parseFloat(getComputedStyle(hd, '::before').opacity) < 0.5) out.push({ text: 'HEADER HAS NO BACKING OVER CONTENT', box: 'hd' })
  // 가로 스크롤 발생 여부
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push({ text: 'HORIZONTAL SCROLL', box: 'html ' + document.documentElement.scrollWidth + ' > ' + innerWidth })
  return [...new Map(out.map(o => [o.text + o.box, o])).values()] })()`
const b = await chromium.launch(); let total = 0
for (const [w, h] of [[1440, 900], [1100, 800], [768, 1024], [390, 844]]) for (const lang of ['ja', 'en']) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, locale: 'ja-JP', deviceScaleFactor: w < 500 ? 2 : 1 })).newPage()
  const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.goto('http://localhost:3997/', { waitUntil: 'networkidle' }); await p.evaluate(l => document.documentElement.setAttribute('data-ui', l), lang)
  await p.addStyleTag({ content: '[data-reveal]{opacity:1!important;transform:none!important;transition:none!important} .rule{transform:none!important} *{animation:none!important} .fix{opacity:1!important;transform:translate(0,-50%)!important} .res b span{opacity:1!important;transform:none!important} .device{transform:none!important} .scr,.scr *{opacity:1!important}' }); await p.evaluate(() => window.scrollTo(0, window.innerHeight * 1.6)); await p.waitForTimeout(900)
  const c = await p.evaluate(CENTER), o = await p.evaluate(OVERFLOW)
  total += c.length + o.length + errs.length
  console.log(`${w} ${lang}: off-center ${c.length}, overflow ${o.length}, js errors ${errs.length}`)
  ;[...c, ...o, ...errs.map(e => ({ error: e }))].forEach(x => console.log('   ', JSON.stringify(x)))
  if (shots) await p.screenshot({ path: join(shots, `full-${w}-${lang}.png`), fullPage: true })
  await p.close()
}
await b.close(); srv.close()
console.log(total === 0 ? 'AUDIT OK' : `AUDIT FAILED (${total})`); process.exit(total === 0 ? 0 : 1)
