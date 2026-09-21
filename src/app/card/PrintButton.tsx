'use client'
import styles from './PrintButton.module.css'

// 프린트 버튼 — 인쇄물은 3개 국어 고정 문구라 별도 i18n 없이 사용
export default function PrintButton() {
  return (
    <button
      type="button"
      className={styles.printBtn}
      onClick={() => window.print()}
    >
      🖨 Print / 印刷 / 인쇄
    </button>
  )
}
