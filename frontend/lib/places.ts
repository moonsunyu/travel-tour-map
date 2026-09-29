// lib/places.ts

import { createClient } from "@/lib/supabase/client";
import { haversineKm } from "@/lib/geo";
import { kakaoKeywordSearch } from "@/lib/kakaoSearch";

export type PlaceRegion = "강원도" | "여수";
export type PlaceCategory = "음식점" | "관광명소" | "숙박";
export type AgeGroupFilter = "선택 안함" | "20" | "30" | "40" | "50" | "60" | "전체";

export type DbPlace = {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  soloFriendly: boolean;
  ageGroups: string[];
};

export type ReferenceSpot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isHub: boolean; // T_{REGION}_SPOT(중심 관광지 마스터)에 실제로 존재하는지
};

export type SearchResult =
  | { mode: "empty" }
  | { mode: "keyword"; matches: DbPlace[] }
  | { mode: "single"; referenceSpot: ReferenceSpot; relatedPlaces: DbPlace[]; soloRestaurants: DbPlace[] };

const REGION_TABLE_PREFIX: Record<PlaceRegion, string> = {
  강원도: "GANGWON",
  여수: "YEOSU",
};

// "혼밥"은 장소 검색이 아니라 혼밥 인증 식당 목록 요청으로 간주 (카카오 호출 없이 즉시 반환)
const SOLO_KEYWORDS = ["혼밥"];

// "숙소", "맛집" 같은 카테고리성 단어는 카카오 키워드 검색이 잘 못 찾아내므로,
// 카카오를 거치지 않고 우리 DB의 category로 바로 필터링한다.
// 카테고리성 단어 목록은 AI를 통해 추출함
const CATEGORY_KEYWORDS: { pattern: RegExp; category: PlaceCategory }[] = [
  { pattern: /맛집|음식점|식당|레스토랑/, category: "음식점" },
  { pattern: /카페|커피/, category: "음식점" },
  { pattern: /숙소|숙박|호텔|펜션|모텔|게스트하우스/, category: "숙박" },
  { pattern: /관광지|관광명소|명소|볼거리/, category: "관광명소" },
];

function matchCategoryKeyword(query: string): PlaceCategory | null {
  for (const { pattern, category } of CATEGORY_KEYWORDS) {
    if (pattern.test(query)) return category;
  }
  return null;
}

// 카카오 1등 결과와 DB 완전일치가 없을 때, 이 거리(km) 이내의 최근접 DB 장소까지는
// "같은 지역을 가리키는 것"으로 보고 대신 기준점으로 채택 (옵션 B)
const FALLBACK_MAX_KM = 5;

function categorizeSpot(raw: string | null | undefined): PlaceCategory {
  const value = (raw ?? "").trim();
  if (value === "숙박") return "숙박";
  if (/음식|카페|맛집|식당|레스토랑|디저트/.test(value)) return "음식점";
  return "관광명소";
}

/**
 * 지역 전체 장소 풀을 세 소스에서 모아 하나로 합침
 * 1. T_{REGION}_POPULAR_SPOT (SPOT_ID 기준 고유) → 관광명소/음식점의 메인 소스, 연령대 정보 포함
 * 2. T_{REGION}_RELATED_SPOT (전체) → 연관관광지, 숙박 카테고리도 여기서 나옴
 * 3. T_{REGION}_SOLO_RESTAURANT → 혼밥 인증업소, 완전 독립 소스
 */
export async function fetchRegionPlaces(region: PlaceRegion): Promise<DbPlace[]> {
  const supabase = createClient();
  const prefix = REGION_TABLE_PREFIX[region];

  const { data: popularRaw } = await supabase
    .from(`T_${prefix}_POPULAR_SPOT`)
    .select('"SPOT_ID","SPOT_NAME","CATEGORY","AGE_GROUP","LATITUDE","LONGITUDE"')
    .not('"LATITUDE"', "is", null);

  const ageGroupMap = new Map<string, string[]>();
  const popularMap = new Map<string, DbPlace>();
  (popularRaw ?? []).forEach((s: any) => {
    const list = ageGroupMap.get(s.SPOT_ID) ?? [];
    if (!list.includes(s.AGE_GROUP)) list.push(s.AGE_GROUP);
    ageGroupMap.set(s.SPOT_ID, list);

    if (!popularMap.has(s.SPOT_ID)) {
      popularMap.set(s.SPOT_ID, {
        id: s.SPOT_ID,
        name: s.SPOT_NAME,
        category: categorizeSpot(s.CATEGORY),
        lat: s.LATITUDE,
        lng: s.LONGITUDE,
        soloFriendly: false,
        ageGroups: [],
      });
    }
  });
  popularMap.forEach((place, id) => {
    place.ageGroups = ageGroupMap.get(id) ?? [];
  });

  const { data: relatedAll } = await supabase
    .from(`T_${prefix}_RELATED_SPOT`)
    .select('"RELATED_SPOT_ID","RELATED_SPOT_NAME","RELATED_CATEGORY","LATITUDE","LONGITUDE"')
    .not('"LATITUDE"', "is", null);

  const relatedMap = new Map<string, DbPlace>();
  (relatedAll ?? []).forEach((r: any) => {
    if (!relatedMap.has(r.RELATED_SPOT_ID)) {
      relatedMap.set(r.RELATED_SPOT_ID, {
        id: r.RELATED_SPOT_ID,
        name: r.RELATED_SPOT_NAME,
        category: categorizeSpot(r.RELATED_CATEGORY),
        lat: r.LATITUDE,
        lng: r.LONGITUDE,
        soloFriendly: false,
        ageGroups: [],
      });
    }
  });

  const { data: restaurants } = await supabase
    .from(`T_${prefix}_SOLO_RESTAURANT`)
    .select('"SPOT_ID","STORE_NAME","LATITUDE","LONGITUDE"')
    .not('"LATITUDE"', "is", null);

  const restaurantPlaces: DbPlace[] = (restaurants ?? []).map((r: any) => ({
    id: r.SPOT_ID,
    name: r.STORE_NAME,
    category: "음식점",
    lat: r.LATITUDE,
    lng: r.LONGITUDE,
    soloFriendly: true,
    ageGroups: [],
  }));

  // 병합: RELATED → POPULAR(더 풍부한 정보로 덮어씀) → 혼밥식당
  const merged = new Map<string, DbPlace>();
  Array.from(relatedMap.values()).forEach((p) => merged.set(p.id, p));
  popularMap.forEach((p, id) => merged.set(id, p));
  restaurantPlaces.forEach((p) => merged.set(p.id, p));

  return Array.from(merged.values());
}

export async function fetchRegionTotals(): Promise<Record<PlaceRegion, number>> {
  const [gangwon, yeosu] = await Promise.all([
    fetchRegionPlaces("강원도"),
    fetchRegionPlaces("여수"),
  ]);
  return { 강원도: gangwon.length, 여수: yeosu.length };
}

/**
 * 카카오 검색 결과와 우리 DB(pool)의 교집합만 추림
 * 매칭 기준: 이름 완전일치, 또는 좌표 30m 이내
 */
function intersectWithPool(kakaoResults: any[], pool: DbPlace[]): DbPlace[] {
  const matched: DbPlace[] = [];
  kakaoResults.forEach((kp) => {
    const kLat = Number(kp.y);
    const kLng = Number(kp.x);
    const hit = pool.find(
      (p) => p.name === kp.place_name || haversineKm(p.lat, p.lng, kLat, kLng) < 0.03,
    );
    if (hit && !matched.find((m) => m.id === hit.id)) matched.push(hit);
  });
  return matched;
}

/**
 * 카카오 1등 결과의 place_name이 검색어 핵심 부분을 담고 있으면
 * "특정 장소 검색"(예: 경포호수)으로 간주. 아니면 "카테고리 검색"(예: 강원도 맛집)으로 간주.
 */
function looksLikeSpecificPlace(query: string, topResult: any): boolean {
  if (!topResult) return false;
  const cleanedQuery = query.replace(/강원도|여수/g, "").trim();
  if (!cleanedQuery) return false;
  return topResult.place_name.includes(cleanedQuery) || cleanedQuery.includes(topResult.place_name);
}

/** 특정 장소 하나를 기준점 삼아 연관장소(RANK순)+혼밥식당을 조립 */
export async function buildSingleModeResult(
  target: DbPlace,
  region: PlaceRegion,
  pool: DbPlace[],
): Promise<SearchResult> {
  const supabase = createClient();
  const prefix = REGION_TABLE_PREFIX[region];

  const { data: hubCheck } = await supabase
    .from(`T_${prefix}_SPOT`)
    .select('"SPOT_ID"')
    .eq('"SPOT_ID"', target.id)
    .maybeSingle();

  // const referenceSpot: ReferenceSpot = {
  //   id: target.id,
  //   name: target.name,
  //   lat: target.lat,
  //   lng: target.lng,
  //   isHub: !!hubCheck,
  // };

  let centerSpotId = target.id;
   let referenceSpot: ReferenceSpot = {
     id: target.id,
     name: target.name,
     lat: target.lat,
     lng: target.lng,
     isHub: !!hubCheck,
   };

  if (!hubCheck) {
    const { data: hubs } = await supabase
      .from(`T_${prefix}_SPOT`)
      //.select('"SPOT_ID","LATITUDE","LONGITUDE"')
      .select('"SPOT_ID","SPOT_NAME","LATITUDE","LONGITUDE"')
      .not('"LATITUDE"', "is", null);

    const nearest = [...(hubs ?? [])].sort(
      (a: any, b: any) =>
        haversineKm(a.LATITUDE, a.LONGITUDE, target.lat, target.lng) -
        haversineKm(b.LATITUDE, b.LONGITUDE, target.lat, target.lng),
    )[0] as any;

    centerSpotId = nearest?.SPOT_ID;
    if (!centerSpotId) {
      return {
        mode: "single",
        referenceSpot,
        relatedPlaces: [],
        soloRestaurants: pool.filter((p) => p.soloFriendly),
      };
    }
     // 검색된 장소가 중심장소(hub)가 아니면, 기준 장소를 실제로 "가장 가까운 중심장소" 정보로 교체
     referenceSpot = {
       id: nearest.SPOT_ID,
       name: nearest.SPOT_NAME,
       lat: nearest.LATITUDE,
       lng: nearest.LONGITUDE,
       isHub: true,
     };
  }

  const { data: relations } = await supabase
    .from(`T_${prefix}_RELATED_SPOT`)
    .select('"RELATED_SPOT_ID","RELATED_SPOT_NAME","RELATED_CATEGORY","LATITUDE","LONGITUDE","RANK"')
    .eq('"CENTER_SPOT_ID"', centerSpotId)
    .order('"RANK"', { ascending: true });

  const poolById = new Map(pool.map((p) => [p.id, p]));

  const relatedPlaces: DbPlace[] = (relations ?? [])
    .filter((r: any) => r.LATITUDE != null)
    .map(
      (r: any) =>
        poolById.get(r.RELATED_SPOT_ID) ?? {
          id: r.RELATED_SPOT_ID,
          name: r.RELATED_SPOT_NAME,
          category: categorizeSpot(r.RELATED_CATEGORY),
          lat: r.LATITUDE,
          lng: r.LONGITUDE,
          soloFriendly: false,
          ageGroups: [],
        },
    );

  const soloRestaurants = pool.filter((p) => p.soloFriendly);

  return { mode: "single", referenceSpot, relatedPlaces, soloRestaurants };
}

/**
 * 검색 메인 함수. 아래 순서로 판별해서, 앞 단계에서 처리되면 뒤 단계는 실행되지 않음.
 *
 * 1. "혼밥" 포함 검색어 → 혼밥 인증 식당 목록 즉시 반환 (카카오 호출 없음)
 * 2. 검색어가 pool 안의 장소명과 완전히 일치 → 카카오를 거치지 않고 그 장소를 바로 기준점으로 사용
 *    (카카오 표기가 DB와 미묘하게 다를 때 생기는 매칭 실패를 애초에 피하기 위함)
 * 3. "숙소", "맛집" 같은 카테고리성 단어 → 카카오 호출 없이 pool을 category로 바로 필터링
 * 4. 위 세 가지에 해당 안 되면 카카오 키워드 검색 실행:
 *    a. 1등 결과가 "특정 장소"로 보이면(looksLikeSpecificPlace):
 *       - DB에 완전일치(이름/좌표) 하는 곳이 있으면 그걸 기준점으로 사용
 *       - 없으면 [옵션 B] 카카오가 알려준 좌표에서 FALLBACK_MAX_KM 이내 가장 가까운 DB 장소로 대체
 *       - 그마저 없으면(너무 멀면) empty
 *    b. "카테고리 검색"으로 보이면, 전체 카카오 결과와 DB 교집합을 keyword 모드로 반환
 */
export async function searchAndGetResults(
  query: string,
  region: PlaceRegion,
  pool: DbPlace[],
): Promise<SearchResult> {
  const trimmed = query.trim();

  if (SOLO_KEYWORDS.some((kw) => trimmed.includes(kw))) {
    return { mode: "keyword", matches: pool.filter((p) => p.soloFriendly) };
  }

  const exactMatch = pool.find((p) => p.name === trimmed);
  if (exactMatch) {
    return buildSingleModeResult(exactMatch, region, pool);
  }

  const categoryMatch = matchCategoryKeyword(trimmed);
  if (categoryMatch) {
    return { mode: "keyword", matches: pool.filter((p) => p.category === categoryMatch) };
  }

  const kakaoResults = await kakaoKeywordSearch(`${region} ${trimmed}`);
  if (kakaoResults.length === 0) return { mode: "empty" };

  const topResult = kakaoResults[0];

  if (looksLikeSpecificPlace(trimmed, topResult)) {
    const kLat = Number(topResult.y);
    const kLng = Number(topResult.x);

    // 완전일치(이름 또는 30m 이내) 먼저 시도
    let target = pool.find(
      (p) => p.name === topResult.place_name || haversineKm(p.lat, p.lng, kLat, kLng) < 0.03,
    );

    // [옵션 B] 완전일치 없으면 FALLBACK_MAX_KM 이내 최근접 DB 장소로 대체
    if (!target) {
      const sorted = [...pool].sort(
        (a, b) => haversineKm(a.lat, a.lng, kLat, kLng) - haversineKm(b.lat, b.lng, kLat, kLng),
      );
      const nearest = sorted[0];
      if (nearest && haversineKm(nearest.lat, nearest.lng, kLat, kLng) < FALLBACK_MAX_KM) {
        target = nearest;
      }
    }

    // 그래도 없으면 empty
    if (!target) return { mode: "empty" };

    return buildSingleModeResult(target, region, pool);
  }

  // 카테고리성 검색 (카카오 결과 기반)
  const matched = intersectWithPool(kakaoResults, pool);
  if (matched.length === 0) return { mode: "empty" };
  return { mode: "keyword", matches: matched };
}

/** 좌표에서 가장 가까운 중심관광지(SPOT)를 찾음. 거리 상한 없음(옵션 B의 5km 제한과는 별개) */
async function findNearestHub(lat: number, lng: number, region: PlaceRegion): Promise<DbPlace | null> {
  const supabase = createClient();
  const prefix = REGION_TABLE_PREFIX[region];

  const { data: hubs } = await supabase
    .from(`T_${prefix}_SPOT`)
    .select('"SPOT_ID","SPOT_NAME","CATEGORY","LATITUDE","LONGITUDE"')
    .not('"LATITUDE"', "is", null);

  if (!hubs || hubs.length === 0) return null;

  const nearest = [...hubs].sort(
    (a: any, b: any) =>
      haversineKm(a.LATITUDE, a.LONGITUDE, lat, lng) - haversineKm(b.LATITUDE, b.LONGITUDE, lat, lng),
  )[0] as any;

  return {
    id: nearest.SPOT_ID,
    name: nearest.SPOT_NAME,
    category: categorizeSpot(nearest.CATEGORY),
    lat: nearest.LATITUDE,
    lng: nearest.LONGITUDE,
    soloFriendly: false,
    ageGroups: [],
  };
}

/** "현 지도에서 검색" / "내 위치 주변"에서 사용. 좌표 → 최근접 중심관광지 → 연관장소+식당 조립 */
export async function searchFromCoordinates(
  lat: number,
  lng: number,
  region: PlaceRegion,
  pool: DbPlace[],
): Promise<SearchResult> {
  const nearestHub = await findNearestHub(lat, lng, region);
  if (!nearestHub) return { mode: "empty" };
  return buildSingleModeResult(nearestHub, region, pool);
}