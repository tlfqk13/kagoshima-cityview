'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './OfflineBanner.module.css'

const DISMISSED_KEY = 'pwa-install-dismissed'

export default function OfflineBanner() {
  const { t } = useTranslation()
  const [isOnline, setIsOnline] = useState(true)
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    // Online/offline detection
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Install banner: show if not dismissed AND not already installed (standalone)
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!dismissed && !isStandalone) {
      // Delay 3s so it doesn't interrupt initial page load
      const timer = setTimeout(() => setShowInstall(true), 3000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  function dismissInstall() {
    localStorage.setItem(DISMISSED_KEY, '1')
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

  if (showInstall) {
    return (
      <div className={`${styles.banner} ${styles.install}`} role="complementary">
        <span className={styles.text}>{t('offline.installHint')}</span>
        <button className={styles.dismiss} onClick={dismissInstall} aria-label="Dismiss">
          ×
        </button>
      </div>
    )
  }

  return null
}
