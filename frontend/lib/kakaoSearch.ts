// lib/kakaoSearch.ts
// 사용자가 검색 시 키워드 추출

export function kakaoKeywordSearch(query: string): Promise<any[]> {
  return new Promise((resolve) => {
    if (!window.kakao?.maps?.services) {
      // SDK가 아직 로드 안 됐거나 실패한 경우, 에러를 던지는 대신 빈 배열로 안전하게 처리
      resolve([]);
      return;
    }
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(query, (result: any[], status: string) => {
      resolve(status === window.kakao.maps.services.Status.OK ? result : []);
    });
  });
}