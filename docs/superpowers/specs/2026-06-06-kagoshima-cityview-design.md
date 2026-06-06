# 가고시마 시티뷰 버스 가이드 — 설계 문서

**작성일:** 2026-06-06  
**버전:** 1.2 (3-agent 리뷰 피드백 전면 반영)  
**상태:** 확정

---

## 변경 이력

| 버전 | 변경 내용 |
|------|-----------|
| 1.0 | 최초 작성 |
| 1.1 | 내장 데브로그 추가 |
| 1.2 | 기술·UX·데이터 3-agent 리뷰 결과 전면 반영 |

---

## 1. 프로젝트 개요

### 배경 및 목적

2026년 5월 가고시마를 방문한 사용자가 시티뷰 버스 텐몬칸 정류장을 구글맵에서 찾지 못해 실제와 다른 위치에서 10분 이상 대기하다 버스를 놓친 경험에서 출발. TripAdvisor(영어), 한국 블로그(brunch.co.kr), 일본 여행 커뮤니티(4travel.jp) 등 전 세계적으로 동일한 불편을 겪은 여행자 사례가 다수 확인됨.

**최종 목표:** 가고시마시 관광과(観光課)의 공식 채택 — 관광 가이드 또는 관광객 안내 자료로 활용.

**서비스 철학:** 무료 · 광고 없음 · 팬메이드 공공재. 가고시마시 공식 GTFS-JP 오픈데이터 기반.

### 핵심 가치 제안

- 구글맵에 오류가 있는 정류장의 **정확한 GPS 위치** 제공
- 가고시마 시티뷰 버스 **전체 20개 정류장 노선 지도 시각화**
- **다국어 지원** (한국어 · English · 日本語) — 글로벌 관광객 대응
- **목적지 카테고리 브라우징** — 드롭다운이 아닌 카드 기반 추천
- **PWA** — 시로야마 WiFi 데드존 등 오프라인 환경 대응

---

## 2. 데이터 레이어

### 데이터 소스

- **가고시마시 공식 GTFS-JP 오픈데이터**
  - URL: `city.kagoshima.lg.jp/ict/opendata.html` (항목 3-30)
  - 라이선스: CC BY 4.0
  - 출처 표기: `データ提供：鹿児島市（原データより加工）` — 가공 사실 명시 포함
  - 라이선스 URL 병기: `creativecommons.org/licenses/by/4.0/`
  - 포함 파일: `stops.txt` (GPS 좌표), `routes.txt`, `trips.txt`, `stop_times.txt`
- **현장 검증:** 2026년 5월 현장 방문 기반 텐몬칸 등 오류 정류장 확인
- **TripAdvisor 인용 제거:** ToS 위반 리스크로 공개 인용 삭제. 스토리 페이지에서는 익명 처리("어느 여행자의 리뷰") 또는 직접 경험 서술로 대체.

### 정류장 데이터 구조

```ts
interface BusStop {
  id: string;             // GTFS stop_id
  number: number;         // 노선 순서 (1-20)
  lat: number;            // 위도 (GTFS GPS)
  lng: number;            // 경도 (GTFS GPS)
  name: {
    ko: string;
    en: string;
    ja: string;
  };
  googleMapsError: boolean;       // 구글맵 오류 정류장 (수동 관리)
  googleMapsErrorNote?: string;   // 오류 내용 메모 (선택)
  destinations: Destination[];
}

interface Destination {
  name: { ko: string; en: string; ja: string; };
  walkMinutes: number;
  category: 'sightseeing' | 'food' | 'nature' | 'shopping';
}

// stops.json 최상위 메타데이터
interface StopsData {
  metadata: {
    sourceVersion: string;      // GTFS 원본 버전/일자
    lastValidatedAt: string;    // ISO 8601 — 마지막 현장 검증일
    lastUpdatedAt: string;      // 데이터 파일 마지막 수정일
    disclaimer: {
      ko: string;
      en: string;
      ja: string;
    };
  };
  stops: BusStop[];
}
```

**disclaimer 내용 (3개 언어):**
> "이 서비스는 GPS 정류장 위치 정보를 제공합니다. 실제 운행 시간 및 노선은 가고시마시 공식 앱 또는 버스 정류장 안내판을 반드시 확인하세요."

**googleMapsError 관리 원칙:**
- 최소 분기 1회 현장 또는 위성 이미지로 재확인
- 확인 일자를 `googleMapsErrorNote`에 기록
- Google Maps 수정 확인 시 즉시 false로 업데이트

### 데이터 관리 방식

- **초기:** GTFS stops.txt 파싱 → `/src/data/stops.json` 정적 파일
- **업데이트:** 관리자 페이지 → 수동 편집 → Vercel 재배포 트리거 (CDN 캐시 자동 무효화)
- **업데이트 주기:** 가고시마시 다이어 개정 시 (연 1~2회), googleMapsError 재확인은 분기 1회
- **자동화 없음:** 데이터 변경 주기가 길어 수동 갱신으로 충분. 단, 자동 알림 없이 운영자가 직접 챙겨야 한다는 한계 인식.

---

## 3. 페이지 아키텍처

### 라우팅 구조

```
/                     → 스토리 페이지 (브랜드 랜딩) — 데브로그 티저 포함
/map                  → 지도 페이지 (메인 기능) — NAV에서 가장 prominent
/map/[stopId]         → 특정 정류장 선택 상태 (경로 파라미터, Suspense 안전)
/story                → 데브로그 에피소드 목록
/story/[slug]         → 개별 에피소드 (MDX)
/admin                → 관리자 대시보드 (인증 필요)
/admin/login          → 관리자 로그인
```

**`/map?stop=id` 쿼리 파라미터 방식 폐기 이유:**  
`useSearchParams()`는 Suspense boundary 없이 Next.js 15에서 빌드 오류. 지도 컴포넌트가 `ssr: false` dynamic import 안에 있어 Suspense 중첩 + race condition 발생. 경로 파라미터(`/map/[stopId]`)로 대체.

### 페이지별 설계

#### (1) 스토리 페이지 `/`

**목적:** 브랜드 첫인상. 관광과 담당자, 언론, 개발자에게 어필. 여행자는 NAV의 "지도" 버튼으로 즉시 이탈 가능.

**NAV 설계 원칙:** "지도 보기" 버튼을 NAV 우상단에 primary button으로 항상 노출. 스토리 페이지라도 여행자가 지도로 한 번에 이동 가능.

**구성 (스크롤 순서):**
1. **글로벌 NAV** — 로고 · 스토리/지도 링크 · 언어 선택 · **"지도 열기" primary 버튼**
2. **히어로 섹션** — 2단: 좌측 대형 명조체 카피 + 우측 사쿠라지마 이미지
   - 카피: "버스 정류장을 찾지 못해 헤맸던 여행자가 직접 만든 가이드"
   - CTA: "지도 보기" (primary) · "스토리 읽기" (ghost)
3. **스토리 섹션** — 직접 경험 서술 (TripAdvisor 인용 제거, 직접 경험 + 익명 여행자 언급)
4. **신뢰 근거 섹션** — 통계 (정류장 20 / 언어 3 / 비용 0) + GTFS 공식 데이터 표기 + 검증 날짜
5. **문제 섹션** — 다크 배경, 3열: 구글맵 오류 / 안내판 없음 / 다국어 정보 부재 (익명 여행자 경험)
6. **제작 이야기 티저** — 데브로그 최신 2편 카드 (여행자가 아닌 개발자/관광과 담당자 대상)
7. **협력 제안 섹션** — 신뢰 근거(정확도·데이터 출처·사용자 피드백) 먼저, CTA는 마지막
8. **푸터** — GTFS 출처 표기 · CC BY 4.0 링크 · 면책 문구

**디자인:** A안 (和 · 전통 일본 에디토리얼) — 변경 없음

#### (2) 지도 페이지 `/map`

**목적:** 핵심 기능. 현장 여행자가 지금 당장 쓸 수 있는 실용 인터페이스.

**레이아웃 — 데스크톱:**
- 상단 바: 로고 · 언어 선택
- 지도 영역 (Mapbox GL JS): 노선 폴리라인 + 20개 정류장 핀
- 우측 사이드패널: 정류장 목록 + 선택 정류장 상세 + 목적지 카드

**레이아웃 — 모바일 (핵심 변경):**
- 지도 풀스크린 (상단 바 최소화)
- **바텀시트(Bottom Sheet)** — 기본: 정류장 목록 미리보기 / 핀 탭 시: 상세 정보로 슬라이드업
- 바텀시트 상단에 목적지 카테고리 칩(chip) 행: 🏯역사 · 🌊자연 · 🍜맛집 · 🛍쇼핑

**목적지 추천 로직 (드롭다운 → 카테고리 브라우징으로 교체):**

기존 드롭다운 방식 폐기 이유: 목적지를 모르는 외국인에게 드롭다운은 작동하지 않음.

대체 방식:
1. **카테고리 칩** — 🏯역사 / 🌊자연 / 🍜맛집 / 🛍쇼핑 중 선택
2. 선택 시 해당 카테고리 목적지가 있는 정류장만 지도에서 강조
3. 바텀시트에 목적지 카드 목록 표시 (썸네일 + 이름 + 도보 시간)
4. 카드 탭 → 해당 정류장으로 지도 이동 + 상세 패널 열림

**정류장 핀 스타일:**
- 일반: 남색 원
- 구글맵 오류 있는 정류장: ⚠️ 배지 추가 + 패널에 "이 앱 위치가 정확합니다" 안내
- 선택됨: 적갈색 + 글로우
- 카테고리 필터 시 비해당: 50% 투명도

**지도 기술 설정:**
- `dynamic(() => import('@/components/map/MapCanvas'), { ssr: false })` 필수
- Mapbox CSS를 `_document` 또는 global CSS에서 직접 import (dynamic import 밖)
- Turbopack 비활성화 (`next.config.js`에서 `experimental.turbo` 미사용) — Mapbox Worker URL 이슈 회피
- Mapbox 토큰: 허용 URL 스코프 제한 (`kagoshima-bus.vercel.app` 등 도메인 고정)
- 초기 중심: `[130.5581, 31.5897]` (가고시마역), 줌 13

#### (3) 데브로그 `/story` + `/story/[slug]`

**목적:** 제작 과정 기록. 주 독자: 개발자, 관광과 담당자, 개인 블로그 독자.

**홈 노출:** 홈 스토리 페이지 하단에 2편 티저 (섹션명: "제작 이야기"). 여행자 핵심 흐름(히어로 → 지도 버튼)과 분리.

**파일 구조 (다국어 대응):**
```
content/
  story/
    ko/
      01-missed-the-bus.mdx
      02-everyone-suffers.mdx
      03-planning.mdx
      04-design.mdx
      05-building.mdx
      06-pitch.mdx           # published: false
    en/
      01-missed-the-bus.mdx
      ...
    ja/
      01-missed-the-bus.mdx
      ...
```

**fallback 전략:** 요청 언어의 MDX가 없으면 `ko` fallback. `lib/devlog.ts`가 처리.

**프론트매터:**
```yaml
---
title: "가고시마에서 버스를 놓쳤다"
episode: 1
date: "2026-06-06"
summary: "2026년 5월, 텐몬칸 정류장을 찾지 못해 버스를 놓쳤다."
published: true
lang: ko
---
```

**에피소드 6편 (확정):**

| slug | 제목 | 공개 여부 |
|------|------|-----------|
| `01-missed-the-bus` | 가고시마에서 버스를 놓쳤다 | 런칭 시 공개 |
| `02-everyone-suffers` | 전 세계가 같은 걸 겪고 있었다 | 런칭 시 공개 |
| `03-planning` | 관광과에 채택시키겠다는 목표 | 런칭 시 공개 |
| `04-design` | 목업 3종 만들고 A안 고른 이유 | 런칭 시 공개 |
| `05-building` | Next.js + Mapbox로 20개 핀 찍기 | 런칭 시 공개 |
| `06-pitch` | 가고시마시에 연락했습니다 | **런칭 후 결과 나오면 공개** |

**에피소드 6편 홈 노출 제거:** `published: false`인 에피소드는 홈 티저 및 `/story` 목록에서 완전히 숨김. 미완성 내러티브를 전면에 두지 않음.

#### (4) 관리자 페이지 `/admin`

**MVP 이후로 이연 (우선순위 조정):**
- 런칭 MVP에서 제외. stops.json 직접 편집 + Vercel 재배포로 초기 운영 가능.
- MVP 이후 방문자 증가 or 관광과 채택 시점에 구현.
- 단, NextAuth 인증 코드는 `/admin` 라우트 보호용으로 미리 세팅 (데이터 편집 UI 없이 라우트만).

---

## 4. 기술 스택

| 레이어 | 기술 | 이유 / 비고 |
|--------|------|------------|
| 프레임워크 | Next.js 15 (App Router) | SSG+SSR 혼용, Vercel 최적화 |
| 지도 | Mapbox GL JS | 일본어 지명 네이티브 지원, 커스텀 스타일. **SSR 비활성화 필수** |
| 인증 | NextAuth.js v5 | Google OAuth. MVP에서는 `/admin` 라우트 보호만 |
| 국제화 | **react-i18next** | next-intl 대체. URL prefix 없이 Context 기반 동작, App Router 미들웨어 충돌 없음 |
| 콘텐츠 | next-mdx-remote | 데브로그 에피소드 MDX 렌더링 |
| 애니메이션 | **CSS transition + Framer Motion 최소 사용** | Framer Motion 전체 import 시 ~45KB. `motion` 경량 분기만 사용 |
| 바텀시트 | 자체 구현 (CSS + touch event) | 외부 라이브러리 없이 100줄 이내로 구현 가능 |
| 폰트 | 시스템 폰트 | Hiragino Mincho / Kaku Gothic — 오프라인 완벽 지원 |
| 분석 | Vercel Analytics | 스크립트 삽입만으로 동작, MVP 포함 |
| 배포 | Vercel (Hobby → Pro 전환 계획) | 공식 채택 시 Hobby ToS 위반 방지용 Pro 전환 필요 |
| PWA | **@ducanh2912/next-pwa** | 기존 next-pwa 방치 패키지 대체. App Router + Next.js 15 지원 확인됨 |

**Turbopack 비활성화:**
```js
// next.config.js
module.exports = {
  // Mapbox GL JS Worker URL 이슈로 Turbopack 미사용
  experimental: {},
}
```

**미들웨어 충돌 해소:**
NextAuth v5 미들웨어만 사용. react-i18next는 미들웨어 없이 Context + cookie로 동작하므로 충돌 없음.

---

## 5. 다국어 (i18n)

**라이브러리:** react-i18next (next-intl 대체)

**언어:** 한국어 (기본) · English · 日本語

**언어 유지:** `i18next-browser-languagedetector` — 쿠키 우선, 없으면 브라우저 언어 자동 감지

**URL 전략:** prefix 없음 (`/map`이 KO/EN/JP 모두 동일 URL)

**URL 공유 문제 해결책:** 링크 공유 시 `?lang=en` 쿼리 파라미터 지원 (선택적). QR코드 생성 시 `?lang=ja` 등 포함 가능.

**번역 파일:** `/messages/{ko,en,ja}.json`

**번역 범위:**
- UI 텍스트 전체
- 정류장 이름 (stops.json 내 `name.{ko,en,ja}`)
- 목적지 추천 설명
- 스토리 페이지 본문
- 데브로그 에피소드 본문 (`content/story/{locale}/*.mdx`)
- 법적 면책 문구 (3개 언어 필수)

**번역 검증:** 정류장명 ja 번역은 GTFS 원본 일본어 명칭 사용(오역 없음). ko/en은 초기 릴리즈 전 네이티브 검토 1회.

---

## 6. 컴포넌트 구조

```
src/
  app/
    page.tsx                  # 스토리 페이지
    map/
      page.tsx                # 지도 목록 (정류장 미선택)
      [stopId]/
        page.tsx              # 특정 정류장 선택 상태
    story/
      page.tsx                # 에피소드 목록
      [slug]/
        page.tsx              # 개별 에피소드
    admin/
      page.tsx                # 관리자 (MVP 이후 — 라우트 보호만 구현)
      login/page.tsx
    layout.tsx                # 글로벌 레이아웃 + i18n Provider
  components/
    Nav.tsx                   # "지도 열기" primary 버튼 포함
    LanguageSwitcher.tsx
    home/
      Hero.tsx
      StorySection.tsx        # TripAdvisor 인용 → 익명 처리
      TrustSection.tsx        # 신뢰 근거 (통계 + 데이터 출처 + 검증 날짜)
      ProblemGrid.tsx
      DevlogTeaser.tsx        # published 에피소드 2편만
      PartnershipSection.tsx  # 신뢰 근거 먼저, CTA 마지막
    map/
      MapCanvas.tsx           # Mapbox GL JS (ssr:false dynamic import)
      StopPin.tsx             # GeoJSON Layer 방식 (React 마커 X)
      RoutePolyline.tsx
      SidePanel.tsx           # 데스크톱 전용
      BottomSheet.tsx         # 모바일 전용 — 바텀시트
      CategoryChips.tsx       # 🏯🌊🍜🛍 필터 칩
      StopList.tsx
      StopDetail.tsx
      DestinationCards.tsx    # 카테고리별 목적지 카드 (드롭다운 대체)
      MapDisclaimer.tsx       # "운행 시간은 공식 앱 확인" 면책
    devlog/
      EpisodeCard.tsx
      EpisodeNav.tsx
      EpisodeToc.tsx
  content/
    story/
      ko/ en/ ja/             # 언어별 MDX 디렉토리
  data/
    stops.json                # metadata + stops[] 구조
    destinations.json
  lib/
    stops.ts
    devlog.ts                 # locale fallback 포함
    i18n.ts                   # react-i18next 설정
  messages/
    ko.json en.json ja.json
```

---

## 7. 비기능 요구사항

### 성능
- Lighthouse 90+ (모바일)
- 초기 로드 3초 이내 (Mapbox 지연 로드, Framer Motion 최소 사용)
- stops.json 정적 파일: Vercel 재배포 시 CDN 자동 무효화 (별도 처리 불필요)

### 오프라인 (PWA)
- 정류장 데이터 및 정적 에셋 캐시
- 지도 타일 오프라인 미지원 (Mapbox 제약) — 오프라인 시 "지도를 표시할 수 없습니다. 저장된 정류장 목록은 아래에서 확인하세요" 폴백 UI

### 법적 사항
- **CC BY 4.0:** 푸터에 출처 + 가공 사실 + 라이선스 URL 명시
- **TripAdvisor 인용 금지:** 서비스 내 어디에도 TripAdvisor 리뷰 직접 인용 없음
- **면책 문구:** 지도 페이지 하단 + stops.json metadata에 3개 언어로 포함
- **Vercel Pro 전환:** 관광과 공식 채택 전 Hobby → Pro (상업적 이용 ToS 대응)

### 운영 지속성 (1인 운영 한계 인식)
- 다이어 개정 시 업데이트 주기: 연 1~2회
- googleMapsError 재확인: 분기 1회
- 운영자 장기 부재 시 대응: README에 데이터 업데이트 방법 문서화 (기여자 대응 가능하도록)

### 관광과 공식 채택 전 준비사항
- 업데이트 주기 명문화
- 면책 조항 법률 검토 (간이 수준)
- Vercel Pro 전환
- 연락처 이메일 공개

---

## 8. MVP 범위 (재정의)

**MVP 포함 (우선순위 순):**
1. 지도 페이지 — 20개 정류장 + 노선 + 카테고리 필터 + 바텀시트 (모바일)
2. 스토리 페이지 — 히어로 + 스토리 + 신뢰 섹션 + 데브로그 티저 + 협력 섹션
3. 다국어 (KO/EN/JP)
4. 데브로그 — 5편 공개 (`06-pitch` 미공개)
5. PWA 기본 (@ducanh2912/next-pwa)
6. Vercel Analytics
7. Vercel 배포

**MVP 제외 (이후 단계):**
- 관리자 페이지 데이터 편집 UI (라우트 보호만)
- 실시간 버스 위치
- 시간표

---

## 9. 디자인 시스템 (A안 확정)

```css
--font-serif: 'Hiragino Mincho ProN', 'HiraMinProN-W3', 'Yu Mincho', 'YuMincho', Georgia, serif;
--font-sans:  'Hiragino Kaku Gothic ProN', 'HiraKakuProN-W3', 'Yu Gothic', 'YuGothic', -apple-system, sans-serif;
--font-mono:  'SF Mono', 'Menlo', monospace;

--bg:     #F4EFE9;   /* 화산재 베이지 */
--ink:    #1C1A18;   /* 먹색 */
--muted:  #8A8278;   /* 연기 */
--rule:   #DDD7D0;   /* 구분선 */
--accent: #8B4513;   /* 赤褐 */
--dark:   #1F1E1A;   /* 다크 배경 */
```

**모바일 UI 보완:**
- 바텀시트: 배경 `--bg`, 핸들 `--rule`, 최대 높이 `85dvh`
- 카테고리 칩: `border: 1px solid --rule`, 선택 시 `--dark` 배경 + `--bg` 텍스트
- 핀 클릭 → 바텀시트 슬라이드업 애니메이션: CSS `transform + transition` (Framer Motion 불필요)

---

## 10. 협력 제안 전략 (관광과 어필)

**어필 순서 (신뢰 근거 → CTA):**
1. 서비스 완성도 확인 가능한 URL 제공
2. 공식 GTFS 데이터 기반 + 현장 검증 사실
3. 글로벌 여행자 니즈 데이터 (익명 경험 인용)
4. 무료 · 광고 없음 · 지속 운영 의지
5. 다국어 완비 (관광과 직원도 일본어로 사용 가능)
6. → 협력 문의 CTA

**연락 채널:** 협력 문의 폼 (이메일 발송). 이메일 주소 푸터 공개.
