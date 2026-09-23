import { test, expect } from '@playwright/test'
import en from '../../src/messages/en.json'
import ko from '../../src/messages/ko.json'
import ja from '../../src/messages/ja.json'
import zhHant from '../../src/messages/zh-Hant.json'

test.beforeEach(async ({ page }) => {
  // 자동 회귀는 외부 서비스에 의존하지 않는다. 실지도는 별도로 검증한다.
  await page.route(/https:\/\/.*(?:mapbox\.com|mapbox\.cn|vercel-insights\.com|va\.vercel-scripts\.com)/, route => route.abort())
  await page.addInitScript(() => localStorage.setItem('pwa-install-dismissed', '1'))
})

test('언어 전환은 본문·메뉴·HTML·새로고침에 일치한다', async ({ page }) => {
  await page.goto('/story?lang=ja')
  for (const [language, messages] of Object.entries({ en, ko, ja, 'zh-Hant': zhHant })) {
    await page.getByRole('button', { name: `Switch to ${language.toUpperCase()}` }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.devlog.pageHeading)
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await expect(page.getByRole('button', { name: `Switch to ${language.toUpperCase()}` })).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.devlog.pageHeading)
    await expect(page.locator('html')).toHaveAttribute('lang', language)
  }
  await page.getByRole('button', { name: 'Switch to EN' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.devlog.pageHeading)
  await page.goto('/story/01-missed-the-bus')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('I Missed the Bus')
  await expect(page.locator('article')).toContainText('In May 2026, I went on a trip to Kagoshima.')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('동시 요청의 언어가 섞이지 않는다', async ({ request }) => {
  const responses = await Promise.all(['ko', 'en', 'ja', 'zh-Hant'].map(async language => {
    const response = await request.get(`/story?lang=${language}`)
    return { language, html: await response.text() }
  }))
  for (const { language, html } of responses) {
    expect(html).toContain(`<html lang="${language}"`)
    expect(html).toContain(({ ko, en, ja, 'zh-Hant': zhHant })[language as 'ko' | 'en' | 'ja' | 'zh-Hant'].devlog.pageHeading)
  }
})

test('미실측 정류장은 GPS 검증으로 표시하지 않는다', async ({ page, isMobile }) => {
  for (const [route, stop] of [['cityview-night', 'cn_stop_01'], ['islandview', 'iv_stop_03']]) {
    await page.goto(`/map?route=${route}&stop=${stop}&lang=en`)
    const panel = isMobile ? page.getByRole('complementary', { name: en.map.stopListAria }) : page.locator('aside')
    await expect(panel.getByText(en.map.stopDetail.sourceChecked, { exact: true })).toBeVisible()
    await expect(panel.getByText(en.map.stopDetail.gpsVerified, { exact: false })).toHaveCount(0)
  }
})

test('모바일 상세에서 목록 복귀·검색·재선택이 된다', async ({ page, isMobile }) => {
  test.skip(!isMobile, '모바일 바텀시트 전용 흐름')
  await page.goto('/map/stop_01?lang=en')
  const panel = page.getByRole('complementary', { name: en.map.stopListAria })
  await panel.getByRole('button', { name: en.map.backToList }).click()
  await expect(panel.getByRole('list')).toBeVisible()
  await panel.getByRole('list').getByRole('button').first().click()
  // 상세에서는 필터·검색을 숨겨 시간표를 먼저 보여준다 — 검색은 목록으로 돌아가서
  await expect(panel.getByPlaceholder(en.map.searchPlaceholder)).toHaveCount(0)
  await panel.getByRole('button', { name: en.map.backToList }).click()
  await panel.getByPlaceholder(en.map.searchPlaceholder).fill('Tenmonkan')
  await expect(panel.getByRole('button', { name: en.map.backToList })).toHaveCount(0)
  await expect(panel.getByRole('list').getByRole('button')).toHaveCount(2)
  await panel.getByRole('list').getByRole('button').first().click()
  await expect(panel.getByRole('button', { name: en.map.backToList })).toBeVisible()
})

test('작은 화면에서도 상단 조작 요소가 내비게이션을 벗어나지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?lang=en')
  const nav = page.getByRole('navigation', { name: en.nav.site }).first()
  const frame = await nav.boundingBox()
  expect(frame).not.toBeNull()
  for (const button of [
    nav.getByRole('link', { name: `${en.nav.openMap} →` }),
    nav.getByRole('button', { name: 'Switch to EN' }),
    nav.getByRole('button', { name: en.nav.menu }),
  ]) {
    await expect(button).toBeVisible()
    const box = await button.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    expect(box!.y).toBeGreaterThanOrEqual(frame!.y)
    expect(box!.y + box!.height).toBeLessThanOrEqual(frame!.y + frame!.height)
  }
})

test('관리자 인증과 잘못된 정류장 보호가 유지된다', async ({ request }) => {
  const response = await request.get('/admin', { maxRedirects: 0 })
  expect(response.status()).toBe(307)
  expect(response.headers().location).toContain('/admin/login')
  expect((await request.get('/admin/login')).status()).toBe(200)
  expect((await request.get('/map/not-a-stop')).status()).toBe(404)
  expect((await request.get('/card/not-a-stop')).status()).toBe(404)
})

test('랜딩은 언어별 제목과 정류장 링크를 보여준다', async ({ page }) => {
  for (const [language, messages] of [['ko', ko], ['en', en], ['ja', ja], ['zh-Hant', zhHant]] as const) {
    await page.goto(`/?lang=${language}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(messages.hero.h1line3)
    await expect(page.getByRole('heading', { level: 3, name: messages.home.spots.senganen.title })).toBeVisible()
  }
  // 스팟 카드는 해당 정류장 지도로 연결된다 (마지막으로 연 언어는 繁體中文)
  await page.getByRole('link', { name: `${zhHant.home.spotsCta} →` }).first().click()
  await expect(page).toHaveURL(/\/map\/stop_\d{2}$/)
})

test('사이트 QR 인쇄물은 QR과 호텔 이름을 표시한다', async ({ page, request }) => {
  for (const path of ['/card/site', '/card/poster']) {
    await page.goto(`${path}?hotel=remm`)
    const qr = page.getByRole('img', { name: /QR code/ })
    await expect(qr).toBeVisible()
    expect(await qr.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
    await expect(page.getByText('レム鹿児島')).toBeVisible()
  }
  // 알 수 없는 호텔은 무시하고 기본 인쇄물을 보여준다
  const response = await request.get('/card/site?hotel=unknown')
  expect(response.status()).toBe(200)
  expect(await response.text()).not.toContain('ご宿泊のお客様へ')
})

test('정류장 상세의 FAQ 버튼은 요금·돌아가는 법으로 이동한다', async ({ page, isMobile }) => {
  await page.goto('/map/stop_03?lang=ja')
  const panel = isMobile ? page.getByRole('complementary', { name: ja.map.stopListAria }) : page.locator('aside')
  const faq = panel.getByRole('group', { name: ja.map.faq.title })
  await expect(faq).toBeVisible()
  await faq.getByRole('button', { name: ja.map.faq.fare }).click()
  await expect(panel.getByText('¥230')).toBeVisible()
  await expect(panel.getByText(ja.map.back.title)).toBeVisible()
  // 호텔 모드에서는 그 호텔의 내리는 정류장
  await page.goto('/map?hotel=remm&lang=ja')
  await panel.getByRole('group', { name: ja.map.faq.title }).getByRole('button', { name: ja.map.faq.back }).click()
  await expect(panel.getByText(/帰りは No\.19 /)).toBeVisible()
})

test('프런트 도우미는 키가 없으면 준비 중 안내와 기본 정보만 보여준다', async ({ page, request }) => {
  await page.goto('/desk?hotel=remm&lang=ja')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('レム鹿児島')
  await expect(page.getByText('No.3')).toBeVisible()
  await expect(page.getByText('No.19')).toBeVisible()
  // ANTHROPIC_API_KEY 없는 테스트 환경: 질문 폼 대신 준비 중 안내, API는 503
  await expect(page.getByRole('status')).toContainText(ja.desk.notConfigured)
  const res = await request.post('/api/desk', { data: { hotel: 'remm', question: '最終バスは何時？', guestLang: 'en' } })
  expect(res.status()).toBe(503)
  const nf = await request.get('/desk?hotel=nope')
  expect(nf.status()).toBe(404)
})

test('호텔 QR로 들어오면 호텔 핀과 타는·내리는 정류장을 보여준다', async ({ page, isMobile }) => {
  await page.goto('/map?hotel=remm&lang=ja')
  const panel = isMobile ? page.getByRole('complementary', { name: ja.map.stopListAria }) : page.locator('aside')
  const banner = panel.getByRole('region', { name: 'レム鹿児島から' })
  await expect(banner).toBeVisible()
  // 天文館 호텔: 갈 때 No.3, 돌아올 때 No.19
  await expect(banner.getByRole('button', { name: /No\.3 / })).toHaveAttribute('aria-pressed', 'true')
  await expect(banner.getByRole('button', { name: /No\.19 / })).toBeVisible()
  await expect(page.getByRole('img', { name: `${ja.map.hotel.marker}: レム鹿児島` })).toBeVisible()
  // 내리는 정류장을 누르면 그 정류장이 선택된다
  await banner.getByRole('button', { name: /No\.19 / }).click()
  await expect(panel.getByText('No. 19', { exact: true })).toBeVisible()
  // 정류장 상세의 근처 숙박시설 → 호텔 모드
  await page.goto('/map/stop_03?lang=ja')
  await panel.getByRole('link', { name: /レム鹿児島/ }).click()
  await expect(page).toHaveURL(/\/map\?hotel=remm/)
  await expect(panel.getByRole('region', { name: 'レム鹿児島から' })).toBeVisible()
  // 호텔 이름 카드의 QR은 호텔 모드 지도로 연결된다
  await page.goto('/card/site?hotel=remm')
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible()
})

test('메뉴로 주요 페이지를 오가고 현재 위치를 표시한다', async ({ page, isMobile }) => {
  await page.goto('/?lang=en')
  const nav = page.getByRole('navigation', { name: en.nav.site }).first()
  for (const [label, path] of [[en.nav.story, '/story'], [en.nav.accuracy, '/accuracy'], [en.nav.downloads, '/downloads']] as const) {
    if (isMobile) await nav.getByRole('button', { name: en.nav.menu }).click()
    await nav.getByRole('link', { name: label, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    if (isMobile) await nav.getByRole('button', { name: en.nav.menu }).click()
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page')
    if (isMobile) await nav.getByRole('button', { name: en.nav.closeMenu }).click()
  }
  // 지도는 데스크톱 메뉴에 텍스트 링크를 두지 않고 '지도 열기' 버튼 하나로 간다(중복 제거). 모바일 메뉴에는 남는다
  if (isMobile) {
    await nav.getByRole('button', { name: en.nav.menu }).click()
    await expect(nav.getByRole('link', { name: en.nav.map, exact: true })).toBeVisible()
    await nav.getByRole('button', { name: en.nav.closeMenu }).click()
  } else {
    await expect(nav.getByRole('link', { name: en.nav.map, exact: true })).toHaveCount(0)
  }
  await nav.getByRole('link', { name: `${en.nav.openMap} →` }).click()
  await expect(page).toHaveURL(/\/map$/)
  // 지도 화면에서는 같은 곳으로 가는 "지도 열기" 버튼을 숨긴다
  await expect(nav.getByRole('link', { name: `${en.nav.openMap} →` })).toHaveCount(0)
})

test('정류장 상세는 오늘의 운행을 먼저 보여주고 메모 중복을 없앤다', async ({ page, isMobile }) => {
  await page.goto('/map/stop_02?lang=ja')
  const panel = isMobile ? page.getByRole('complementary', { name: ja.map.stopListAria }) : page.locator('aside')
  await expect(panel.getByText(ja.map.today.label)).toBeVisible()
  // "1日19便。30分間隔。" 메모는 위의 편수·간격 표시와 같으므로 숨긴다
  await expect(panel.getByText('1日19便。30分間隔。')).toHaveCount(0)
  // 운행 시각 안내는 '오늘의 운행' 아래 한 번만 (맨 아래 중복 문구 제거)
  await expect(panel.getByText(ja.map.today.basis)).toHaveCount(1)
  await expect(panel.getByText('運行時刻は公式アプリでご確認ください')).toHaveCount(0)
  if (isMobile) await expect(panel.getByRole('group', { name: ja.map.categoryFilter })).toHaveCount(0)
})
