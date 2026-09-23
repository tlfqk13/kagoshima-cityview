// 랜딩·포스터·인쇄물 이미지 슬롯.
// hero·bay·postcard*는 루트 image/ 의 종이 콜라주 일러스트(엽서)를 그대로 쓴다 — 브랜드 비주얼이므로 실사로 바꾸지 않는다.
// 스팟 카드 4장(saigo·shiroyama·senganen·ferry)은 실사 사진이다. 출처·라이선스는 아래 PHOTO_CREDITS에 기록하고
// Footer가 표시한다(CC BY-SA는 작가 표기가 라이선스 조건). 사진을 바꾸면 크레딧도 같이 바꾼다.
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

// 실사 사진 출처. Pexels 라이선스는 표기 의무가 없지만 작가를 함께 적는다.
export const PHOTO_CREDITS: { key: HomePhotoKey; author: string; license: string; url: string }[] = [
  { key: 'shiroyama', author: 'Livy Travels', license: 'Pexels', url: 'https://www.pexels.com/photo/36825695/' },
  { key: 'ferry', author: 'Marek Piwnicki', license: 'Pexels', url: 'https://www.pexels.com/photo/10479428/' },
  { key: 'senganen', author: 'Kimon Berlin', license: 'CC BY-SA 2.0', url: 'https://www.flickr.com/photos/kimon/4549678962/' },
  { key: 'saigo', author: 'Edward Dick', license: 'CC BY-SA 2.0', url: 'https://www.flickr.com/photos/94376402@N00/37050983/' },
]

// 스팟 카드 — 정류장 ID(cityview)와 사진·문구 키의 연결. 좌표는 노선 JSON에서만 조회한다(ISS-001).
export const SPOTS: { key: 'saigo' | 'shiroyama' | 'senganen' | 'ferry'; stopId: string; photo: HomePhotoKey }[] = [
  { key: 'saigo', stopId: 'stop_04', photo: 'saigo' },
  { key: 'shiroyama', stopId: 'stop_07', photo: 'shiroyama' },
  { key: 'senganen', stopId: 'stop_12', photo: 'senganen' },
  { key: 'ferry', stopId: 'stop_16', photo: 'ferry' },
]
