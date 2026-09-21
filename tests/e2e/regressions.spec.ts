import { test, expect } from '@playwright/test'
import en from '../../src/messages/en.json'
import ko from '../../src/messages/ko.json'
import ja from '../../src/messages/ja.json'

test.beforeEach(async ({ page }) => {
  // 자동 회귀는 외부 서비스에 의존하지 않는다. 실지도는 별도로 검증한다.
  await page.route(/https:\/\/.*(?:mapbox\.com|mapbox\.cn|vercel-insights\.com|va\.vercel-scripts\.com)/, route => route.abort())
  await page.addInitScript(() => localStorage.setItem('pwa-install-dismissed', '1'))
})

test('언어 전환은 본문·메뉴·HTML·새로고침에 일치한다', async ({ page }) => {
  await page.goto('/story?lang=ja')
  for (const [language, messages] of Object.entries({ en, ko, ja })) {
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
  const responses = await Promise.all(['ko', 'en', 'ja'].map(async language => {
    const response = await request.get(`/story?lang=${language}`)
    return { language, html: await response.text() }
  }))
  for (const { language, html } of responses) {
    expect(html).toContain(`<html lang="${language}"`)
    expect(html).toContain(({ ko, en, ja })[language as 'ko' | 'en' | 'ja'].devlog.pageHeading)
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
  await panel.getByPlaceholder(en.map.searchPlaceholder).fill('Tenmonkan')
  await expect(panel.getByRole('button', { name: en.map.backToList })).toHaveCount(0)
  await expect(panel.getByRole('list').getByRole('button')).toHaveCount(2)
  await panel.getByRole('list').getByRole('button').first().click()
  await expect(panel.getByRole('button', { name: en.map.backToList })).toBeVisible()
})

test('작은 화면에서도 상단 조작 요소가 내비게이션을 벗어나지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/map?lang=en')
  const nav = page.getByRole('navigation')
  const frame = await nav.boundingBox()
  expect(frame).not.toBeNull()
  for (const button of [nav.getByRole('link', { name: `${en.nav.openMap} →` }), nav.getByRole('button', { name: 'Switch to EN' })]) {
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
  for (const [language, messages] of [['ko', ko], ['en', en], ['ja', ja]] as const) {
    await page.goto(`/?lang=${language}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(messages.hero.h1line3)
    await expect(page.getByRole('heading', { level: 3, name: messages.home.spots.senganen.title })).toBeVisible()
  }
  // 스팟 카드는 해당 정류장 지도로 연결된다
  await page.getByRole('link', { name: `${ja.home.spotsCta} →` }).first().click()
  await expect(page).toHaveURL(/\/map\/stop_\d{2}$/)
})
