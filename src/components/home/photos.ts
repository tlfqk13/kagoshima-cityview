// 랜딩·포스터 사진 슬롯.
// 지금은 image/ 원본 일러스트를 잘라낸 임시 이미지다. 실사 사진으로 바꿀 때는
// public/images/home/ 에 같은 파일명으로 덮어쓰거나 아래 src만 바꾸면 된다.
// (가로 1200px 전후, JPG q70~80 권장 — PWA precache 부피 절약)
export const HOME_PHOTOS = {
  hero: '/images/home/sakurajima.jpg',
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
