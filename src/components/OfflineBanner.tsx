'use client'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { usePathname } from 'next/navigation'
import { track } from '@/lib/analytics/track'
import styles from './OfflineBanner.module.css'

const DISMISSED_KEY = 'pwa-install-dismissed'

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

export default function OfflineBanner() {
  const { t } = useTranslation()
  const isOnline = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
  const [showInstall, setShowInstall] = useState(false)
  const pathname = usePathname()
  // 지도(바텀시트를 가림)·인쇄물·관리자에서는 설치 안내를 띄우지 않는다
  const installAllowed = !/^\/(map|card|admin)(\/|$)/.test(pathname ?? '')

  useEffect(() => {
    const onInstalled = () => track('pwa_install', { lang: document.documentElement.lang })
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  useEffect(() => {
    // 설치 안내: 닫은 적 없고, 설치(standalone) 상태가 아닐 때만. 3초 뒤 표시, 15초 뒤 자동으로 접는다(닫기 기록은 X를 눌렀을 때만)
    if (!installAllowed) return
    let dismissed: string | null = null
    try { dismissed = localStorage.getItem(DISMISSED_KEY) } catch {}
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (dismissed || isStandalone) return
    const show = setTimeout(() => setShowInstall(true), 3000)
    const hide = setTimeout(() => setShowInstall(false), 18000)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [installAllowed])

  function dismissInstall() {
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
    setShowInstall(false)
  }

  // Offline state takes priority
  if (!isOnline) {
    return (
      <div className={`${styles.banner} ${styles.offline}`} role="status">
        <span className={styles.dot} />
        <span>{t('offline.message')}</span>
      </div>
    )
  }

  if (showInstall && installAllowed) {
    return (
      <div className={`${styles.banner} ${styles.install}`} role="complementary">
        <span className={styles.text}>{t('offline.installHint')}</span>
        <button className={styles.dismiss} onClick={dismissInstall} aria-label={t('common.close')}>
          ×
        </button>
      </div>
    )
  }

  return null
}
