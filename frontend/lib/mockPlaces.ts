// 검색 사이드바용 예시(mock) 장소 데이터. 실제 장소 API가 아직 프론트에 연동되지 않아
// UI 흐름(지역/카테고리 필터, 정렬, 결과 목록)을 보여주기 위한 더미 데이터다.
// 실제 데이터 연동 시 이 파일과 SearchSidebar.tsx의 필터링 로직을 API 호출로 교체하면 된다.

export type PlaceRegion = "강원도" | "여수시";
export type PlaceCategory = "음식점" | "관광명소" | "숙박";
export type AgeGroupFilter = "전체" | "20" | "30" | "40" | "50" | "60";

export interface MockPlace {
  id: string;
  region: PlaceRegion;
  category: PlaceCategory;
  name: string;
  rating: number;
  reviewCount: number;
  walkMinutes: number;
  soloFriendly: boolean;
  ageGroup: AgeGroupFilter;
}

// 지역 탭에 보여줄 "전체 등록 장소 수" — 검색 결과 개수와는 별개의 참고용 총계(더미 값).
export const REGION_TOTALS: Record<PlaceRegion, number> = {
  강원도: 620,
  여수시: 472,
};

export const MOCK_PLACES: MockPlace[] = [
  {
    id: "gw-1",
    region: "강원도",
    category: "음식점",
    name: "경포 바다 파스타",
    rating: 4.85,
    reviewCount: 230,
    walkMinutes: 5,
    soloFriendly: true,
    ageGroup: "20",
  },
  {
    id: "gw-2",
    region: "강원도",
    category: "음식점",
    name: "초당 맑은 순두부 1인상",
    rating: 4.71,
    reviewCount: 94,
    walkMinutes: 15,
    soloFriendly: true,
    ageGroup: "전체",
  },
  {
    id: "gw-3",
    region: "강원도",
    category: "관광명소",
    name: "경포호수 산책로",
    rating: 4.6,
    reviewCount: 150,
    walkMinutes: 3,
    soloFriendly: false,
    ageGroup: "전체",
  },
  {
    id: "ys-1",
    region: "여수시",
    category: "음식점",
    name: "여수밤바다 회센터",
    rating: 4.9,
    reviewCount: 320,
    walkMinutes: 8,
    soloFriendly: true,
    ageGroup: "30",
  },
  {
    id: "ys-2",
    region: "여수시",
    category: "관광명소",
    name: "오동도 전망대",
    rating: 4.8,
    reviewCount: 410,
    walkMinutes: 12,
    soloFriendly: false,
    ageGroup: "전체",
  },
];
