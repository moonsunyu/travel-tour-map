// lib/kakaoGeocode.ts

/** 좌표를 도로명 주소(없으면 지번 주소) 문자열로 변환 */
export function reverseGeocode(lat: number, lng: number): Promise<string> {
  return new Promise((resolve) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result[0]) {
        const road = result[0].road_address?.address_name;
        const jibun = result[0].address?.address_name;
        resolve(road || jibun || "주소를 찾을 수 없어요");
      } else {
        resolve("주소를 찾을 수 없어요");
      }
    });
  });
}