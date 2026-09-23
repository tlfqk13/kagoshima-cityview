// 랜딩·포스터·인쇄물 이미지 슬롯.
// hero·bay·postcard*는 루트 image/ 의 종이 콜라주 일러스트(엽서)를 그대로 쓴다 — 브랜드 비주얼이므로 실사로 바꾸지 않는다.
// 스팟 카드 4장(saigo·shiroyama·senganen·ferry)은 실사 사진 자리다. 지금은 일러스트를 잘라낸 임시 이미지이며,
// 실사로 바꿀 때는 같은 파일명으로 덮어쓰고 출처 표기를 Footer 크레딧에 추가한다.
// (가로 1400px 이하, JPG q80 — PWA precache 부피 절약)
export const HOME_PHOTOS = {
  hero: '/images/home/sakurajima.jpg',
  postcardFerry: '/images/home/postcard-ferry.jpg',
  ferry: '/images/home/ferry.jpg',
  bay: '/images/home/bay.jpg',
  saigo: '/images/home/saigo.jpg',
  shiroyama: '/images/home/shiroyama.jpg',
  senganen: '/images/home/senganen.jpg',
} as const

export type HomePhotoKey = keyof typeof HOME_PHOTOS

// 스팟 카드 — 정류장 ID(cityview)와 사진·문구 키의 연결. 좌표는 노선 JSON에서만 조회한다(ISS-001).
export const SPOTS: { key: 'saigo' | 'shiroyama' | 'senganen' | 'ferry'; stopId: string; photo: HomePhotoKey }[] = [
  { key: 'saigo', stopId: 'stop_04', photo: 'saigo' },
  { key: 'shiroyama', stopId: 'stop_07', photo: 'shiroyama' },
  { key: 'senganen', stopId: 'stop_12', photo: 'senganen' },
  { key: 'ferry', stopId: 'stop_16', photo: 'ferry' },
]
