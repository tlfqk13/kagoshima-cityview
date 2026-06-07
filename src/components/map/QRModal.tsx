'use client'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { RouteStop, RouteId } from '@/lib/routes'
import styles from './QRModal.module.css'

interface Props {
  stop: RouteStop
  routeId: RouteId
  onClose: () => void
}

const BASE_URL = 'https://www.kagoshima-cityview.com'

export default function QRModal({ stop, routeId, onClose }: Props) {
  const { t, i18n } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ko') as 'ko' | 'en' | 'ja'
  const stopName = stop.name[lang]
  const url = `${BASE_URL}/map?route=${routeId}&stop=${stop.id}`

  useEffect(() => {
    async function drawQR() {
      if (!canvasRef.current) return
      try {
        const QRCode = (await import('qrcode')).default
        await QRCode.toCanvas(canvasRef.current, url, {
          width: 240,
          margin: 2,
          color: {
            dark: '#1C1A18',
            light: '#F4EFE9',
          },
        })
      } catch (err) {
        console.error('QR generation failed:', err)
      }
    }
    drawQR()
  }, [url])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `kagoshima-cityview-stop-${stop.number}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={t('map.showQR')}
    >
      <div className={styles.modal}>
        <button
          className={styles.close}
          onClick={onClose}
          aria-label={t('common.close')}
        >
          ✕
        </button>
        <div className={styles.header}>
          <span className={styles.num}>#{stop.number}</span>
          <span className={styles.name}>{stopName}</span>
        </div>
        <canvas ref={canvasRef} className={styles.canvas} />
        <p className={styles.url}>{url}</p>
        <button className={styles.downloadBtn} onClick={handleDownload}>
          {t('map.downloadQR')}
        </button>
      </div>
    </div>
  )
}
