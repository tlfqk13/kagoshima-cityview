# ADR 005: MDX 다국어 파일 구조

**날짜:** 2026-06-06  
**상태:** 승인됨

## 컨텍스트

데브로그 에피소드를 MDX로 작성하고 3개 언어(ko, en, ja)로 제공해야 했다.  
파일 구조를 어떻게 잡을지 결정이 필요했다.

## 검토한 구조

**A안 (단일 파일):**
```
content/story/01-missed-the-bus.mdx   ← 하나의 파일에 ko/en/ja 모두 포함
```

**B안 (locale 폴더 분리):**
```
content/story/ko/01-missed-the-bus.mdx
content/story/en/01-missed-the-bus.mdx
content/story/ja/01-missed-the-bus.mdx
```

## 결정

**B안 — locale 폴더 분리** 사용.

## 이유

A안은 구현이 단순하지만:
- 하나의 MDX 파일에 3개 언어 콘텐츠가 섞이면 작성·번역·유지보수가 어렵다
- frontmatter에서 언어별 제목/요약을 별도 필드로 관리해야 하므로 frontmatter가 비대해진다
- 콘텐츠 번역가(또는 미래의 AI 번역 작업)가 파일을 독립적으로 다루기 어렵다

B안의 장점:
- 각 언어 파일이 독립적 → 번역이 없으면 `ko` fallback으로 자동 처리
- 파일 기준으로 번역 진행 상황 추적 가능 (`ls content/story/en/` → 미번역 에피소드 확인)
- `devlog.ts`의 `getEpisodePath(slug, lang)` 함수가 locale → ko fallback 로직을 캡슐화

## Fallback 로직

```ts
// src/lib/devlog.ts
function getEpisodePath(slug: string, lang: Lang): string | null {
  const p = path.join(CONTENT_DIR, lang, `${slug}.mdx`)
  return fs.existsSync(p) ? p : null
}

// 사용 시: lang 파일 없으면 ko로 fallback
const filePath = getEpisodePath(slug, lang) ?? getEpisodePath(slug, 'ko')!
```

## 현재 번역 상태

| 에피소드 | ko | en | ja |
|----------|----|----|-----|
| 01-missed-the-bus | ✅ | ❌ | ❌ |
| 02-everyone-suffers | ✅ | ❌ | ❌ |
| 03-planning | ✅ | ❌ | ❌ |
| 04-design | ✅ | ❌ | ❌ |
| 05-building | ✅ | ❌ | ❌ |
| 06-pitch | ✅ (미공개) | - | - |

en/ja 번역은 관광과 채택 이후 우선순위.
