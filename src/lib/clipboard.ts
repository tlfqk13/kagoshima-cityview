// 텍스트를 클립보드에 복사하고 성공 여부를 반환한다.
// HTTPS가 아닌 환경(예: 휴대폰에서 LAN IP로 접속)에서는 navigator.clipboard가 없으므로
// 숨긴 textarea + execCommand('copy')로 대체한다.
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 권한 거부 등 — 아래 대체 방식으로 재시도
    }
  }
  return copyWithTextarea(text)
}

function copyWithTextarea(text: string): boolean {
  if (typeof document === 'undefined') return false
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}
