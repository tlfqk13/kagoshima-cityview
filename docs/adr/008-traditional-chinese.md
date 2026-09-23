# ADR 008: 繁體中文(zh-Hant) 추가 — 빌드 타임 번역

날짜: 2026-09-23 · 상태: 적용

## 배경

가고시마를 찾는 외국인 여행자 가운데 대만·홍콩 방문객의 비중이 크다. 시티뷰 정류장 위치를 찾지 못하는 문제는 언어와 무관하므로, 일·영·한에 이어 繁體中文 안내가 필요했다. 다만 런타임 기계번역(외부 AI API)은 오프라인 PWA 동작·CSP·비용·품질 검수 측면에서 맞지 않는다.

## 결정

- 언어 코드는 BCP 47의 `zh-Hant`를 쓴다. `LANGUAGES`(`src/lib/locale.ts`)에 추가하고 `<html lang>`, 쿠키, `?lang=` 쿼리에도 같은 값을 쓴다.
- 번역은 **빌드 타임 정적 파일**로만 제공한다. `src/messages/zh-Hant.json`은 `ja.json`과 같은 키 구조이며, 대만 관광 사이트에서 쓰는 표현(巴士站/站牌, 時刻表, 首班車/末班車, 桌上立牌, 飯店)을 따른다. 노선 JSON의 현지어 객체(`name`, `operatingNote`, `scheduleNote`, `disclaimer`, `connections[].note`)에는 키 `zh`를 추가한다. 좌표는 건드리지 않는다(ISS-001).
- 데이터 키는 `zh`, UI 언어는 `zh-Hant`다. 둘 사이의 변환은 `nameKey(lang)`(`src/lib/routes.ts`) 한 곳에서만 한다.
- **간체 요청(`zh-CN`, `zh-Hans`)도 당분간 `zh-Hant`로 정규화한다.** 간체 자원이 없으니 영어·일본어보다는 繁體가 낫다는 판단이다. 간체를 추가할 때 `normalizeLanguage`의 분기만 바꾸면 된다.
- 데브로그 MDX(`content/story`)는 繁體 원고를 두지 않는다. `zh-Hant`는 `en` → `ko` 순으로 대체하고(`resolveEpisodePath`), 다른 언어는 기존대로 `ko`로 대체한다.
- OG locale은 `zh_TW`, 사이트 이름은 「鹿兒島城市觀光巴士指南」이다.
- 인쇄물(`/card/*`)은 일·영·한 표기를 유지한다. 인쇄 면적이 제한되어 언어를 늘리지 않는다.

## 결과

- 언어 전환 버튼이 4개(`KO · EN · JA · 繁中`)가 된다. aria-label은 `Switch to ZH-HANT`로 기존 형식을 따른다.
- Zen Maru Gothic에는 繁體 전용 글리프(예: 兒·說·灣)가 없어, 해당 글자는 `--font-sans`의 다음 폰트(시스템 CJK)로 글자 단위 대체된다. 정보 전달에는 영향이 없다.
- 번역 품질은 원어민 검수를 거치지 않았다. 관광과·대만 여행자 피드백을 받으면 `zh-Hant.json`만 고치면 된다.
- 단위 테스트는 4개 언어의 키 일치와 노선 데이터의 `zh` 누락을 검사한다.
