// 인쇄물·QR에 박히는 정식 도메인. 인쇄 후에는 바꾸기 어려우므로 한 곳에서만 관리한다.
// 운영사 MAKORO의 서브도메인(makoro.dev). 관광과 채택 시 별도 도메인으로 옮기고,
// 이 주소는 새 도메인으로 영구 리다이렉트(301)해 배포된 QR이 계속 동작하게 한다.
// → makoro.dev는 리다이렉트용으로도 만료시키지 말 것
export const SITE_URL = 'https://kagoshima.makoro.dev'
export const SITE_DOMAIN = 'kagoshima.makoro.dev'
