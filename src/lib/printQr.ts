import QRCode from 'qrcode'

// 인쇄용 QR(서버 전용) — 확대 인쇄해도 깨지지 않도록 SVG data URL로 생성한다.
// 클라이언트 번들에 qrcode가 섞이지 않도록 site.ts와 분리해 둔다.
export async function createQrSvgDataUrl(url: string, dark = '#1C1A18', light = '#FFFFFF') {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark, light },
  })
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
