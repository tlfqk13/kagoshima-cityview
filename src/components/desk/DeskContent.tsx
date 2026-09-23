'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { type Lang, nameKey } from '@/lib/routes'
import { SITE_URL } from '@/lib/site'
import type { DeskResult, GuestLang } from '@/lib/desk'
import { IconBed, IconWalk } from '@/components/icons'
import { track } from '@/lib/analytics/track'
import styles from './DeskContent.module.css'

interface StopInfo {
  id: string
  number: number
  name: Record<Lang, string>
  minutes: number
}

interface Props {
  hotel: { slug: string; nameJa: string }
  board: StopInfo
  alight: StopInfo
  /** ANTHROPIC_API_KEY가 없으면 질문 폼 대신 "준비 중" 안내 */
  configured: boolean
}

const GUEST_LANG_OPTIONS: { code: GuestLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'ja', label: '日本語' },
]

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; result: DeskResult; question: string }
  | { kind: 'error'; code: string }

// 프런트 통역 도우미 — 직원이 일본어로 묻고, 투숙객 언어로 답 카드를 받는다.
// 타는/내리는 정류장 같은 기본 정보는 AI 없이 항상 위에 보여준다.
export default function DeskContent({ hotel, board, alight, configured }: Props) {
  const { t, i18n } = useTranslation()
  const lang = nameKey(i18n.language)
  const [guestLang, setGuestLang] = useState<GuestLang>('en')
  const [question, setQuestion] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const qrRef = useRef<HTMLCanvasElement>(null)
  const hotelMapUrl = `${SITE_URL}/map?hotel=${hotel.slug}`

  // 호텔 모드 지도 QR — 투숙객이 자기 폰으로 가져갈 수 있게
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!qrRef.current) return
      const QRCode = (await import('qrcode')).default
      if (cancelled) return
      await QRCode.toCanvas(qrRef.current, hotelMapUrl, { width: 132, margin: 1, color: { dark: '#1C1A18', light: '#FFFFFF' } })
    })()
    return () => { cancelled = true }
  }, [hotelMapUrl])

  async function ask(text: string) {
    const q = text.trim()
    if (q.length < 2 || state.kind === 'loading') return
    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotel: hotel.slug, question: q, guestLang }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setState({ kind: 'error', code: typeof body.error === 'string' ? body.error : String(res.status) })
        return
      }
      setState({ kind: 'done', result: (await res.json()) as DeskResult, question: q })
      track('desk_ask', { k: hotel.slug, v: guestLang, lang: i18n.language })
    } catch {
      setState({ kind: 'error', code: 'network' })
    }
  }

  const examples = (t('desk.examples', { returnObjects: true }) as string[]) ?? []

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>{t('desk.eyebrow')}</div>
        <h1 className={styles.h1}><IconBed size={20} /> {hotel.nameJa}</h1>
        <p className={styles.intro}>{t('desk.intro')}</p>
      </header>

      {/* 항상 보이는 기본 정보 (AI 없음) */}
      <section className={styles.facts} aria-label={t('desk.factsLabel')}>
        <div className={styles.fact}>
          <span className={styles.factLabel}>{t('map.hotel.board')}</span>
          <span className={styles.factStop}><b>No.{board.number}</b> {board.name[lang]}</span>
          <span className={styles.factWalk}><IconWalk size={12} /> {t('map.walkMin', { min: board.minutes })}</span>
        </div>
        <div className={styles.fact}>
          <span className={styles.factLabel}>{t('map.hotel.alight')}</span>
          <span className={styles.factStop}><b>No.{alight.number}</b> {alight.name[lang]}</span>
          <span className={styles.factWalk}><IconWalk size={12} /> {t('map.walkMin', { min: alight.minutes })}</span>
        </div>
        <div className={styles.qr}>
          <canvas ref={qrRef} width={132} height={132} aria-label={t('desk.qrLabel')} />
          <span className={styles.qrCaption}>{t('desk.qrCaption')}</span>
        </div>
      </section>

      {!configured ? (
        <section className={styles.notice} role="status">{t('desk.notConfigured')}</section>
      ) : (
        <section className={styles.ask} aria-label={t('desk.askLabel')}>
          <div className={styles.langRow} role="group" aria-label={t('desk.guestLang')}>
            <span className={styles.langLabel}>{t('desk.guestLang')}</span>
            {GUEST_LANG_OPTIONS.map(opt => (
              <button
                key={opt.code}
                type="button"
                className={`${styles.langBtn} ${guestLang === opt.code ? styles.langBtnActive : ''}`}
                aria-pressed={guestLang === opt.code}
                onClick={() => setGuestLang(opt.code)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <form
            className={styles.form}
            onSubmit={event => { event.preventDefault(); void ask(question) }}
          >
            <textarea
              className={styles.input}
              value={question}
              onChange={event => setQuestion(event.target.value)}
              placeholder={t('desk.placeholder')}
              rows={3}
              maxLength={300}
              aria-label={t('desk.questionLabel')}
            />
            <button type="submit" className={styles.submit} disabled={state.kind === 'loading' || question.trim().length < 2}>
              {state.kind === 'loading' ? t('desk.loading') : t('desk.submit')}
            </button>
          </form>
          <div className={styles.examples}>
            {examples.map(example => (
              <button key={example} type="button" className={styles.example} onClick={() => { setQuestion(example); void ask(example) }}>
                {example}
              </button>
            ))}
          </div>

          {state.kind === 'error' && (
            <div className={styles.error} role="alert">{t(`desk.errors.${state.code}`, { defaultValue: t('desk.errors.default') })}</div>
          )}

          {state.kind === 'done' && (
            <article className={styles.answer} aria-live="polite">
              <p className={styles.guest} lang={guestLang}>{state.result.answer.guestAnswer}</p>
              <p className={styles.staff}>{state.result.answer.staffSummary}</p>
              {state.result.answer.confidence === 'low' && (
                <p className={styles.lowConfidence}>{t('desk.lowConfidence')}</p>
              )}
              {state.result.stops.length > 0 && (
                <div className={styles.stopLinks}>
                  {state.result.stops.map(stop => (
                    <Link key={stop.id} href={`/map/${stop.id}?hotel=${hotel.slug}`} className={styles.stopLink} target="_blank">
                      No.{stop.number} {stop.nameJa} →
                    </Link>
                  ))}
                </div>
              )}
              <p className={styles.meta}>{t('desk.disclaimer')}</p>
            </article>
          )}
        </section>
      )}
    </div>
  )
}
