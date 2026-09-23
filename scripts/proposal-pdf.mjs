// docs/proposal/print/*.html → public/downloads/*.pdf (A4). 호텔 제안서는 먼저 build-hotel-proposal.py로 HTML을 갱신한다.
import { chromium } from 'playwright'
import { copyFileSync } from 'node:fs'
const DOCS = [['hotels-print', 'hotels-ja'], ['tourism-office-print', 'tourism-office-ja'], ['incident-guide-print', 'incident-guide-ja']]
const b = await chromium.launch()
for (const [src, name] of DOCS) {
  const p = await b.newPage()
  await p.goto(`file://${process.cwd()}/docs/proposal/print/${src}.html`, { waitUntil: 'networkidle' })
  await p.pdf({ path: `public/downloads/${name}.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true })
  await p.close()
  if (name !== 'incident-guide-ja') copyFileSync(`public/downloads/${name}.pdf`, `docs/proposal/pdf/${name}.pdf`)
  console.log('pdf', name)
}
await b.close()
