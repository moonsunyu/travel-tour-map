// lib/places.ts

import { createClient } from "@/lib/supabase/client";
import { haversineKm } from "@/lib/geo";

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
  isHub: boolean;
};

const REGION_TABLE_PREFIX: Record<PlaceRegion, string> = {
  강원도: "GANGWON",
  여수: "YEOSU",
};

function categorizeSpot(raw: string | null | undefined): PlaceCategory {
  const value = (raw ?? "").trim();
  if (value === "숙박") return "숙박";
  if (/음식|카페|맛집|식당|레스토랑|디저트/.test(value)) return "음식점";
  return "관광명소";
}


export async function fetchRegionPlaces(region: PlaceRegion): Promise<DbPlace[]> {
  const supabase = createClient();
  const prefix = REGION_TABLE_PREFIX[region];

  // 1. 인기관광지 — 관광명소/음식점의 진짜 소스 (56개, SPOT_ID 기준 고유)
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
        ageGroups: [], // 아래서 한 번에 채움
      });
    }
  });
  // 연령대 정보 반영
  popularMap.forEach((place, id) => {
    place.ageGroups = ageGroupMap.get(id) ?? [];
  });

  // 2. 연관관광지 전체 (555개, 이 중 POPULAR_SPOT과 겹치는 29개는 merge 시 자동 정리)
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

  // 3. 혼밥식당 (39개, 완전 독립)
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

  // 병합: POPULAR_SPOT 값을 우선(연령대 정보가 있으니), RELATED만 있는 건 추가, 혼밥식당은 별개로 추가
  const merged = new Map<string, DbPlace>();
  Array.from(relatedMap.values()).forEach((p) => merged.set(p.id, p));
  popularMap.forEach((p, id) => merged.set(id, p)); // POPULAR_SPOT이 나중에 덮어써서 ageGroups 등 더 풍부한 정보 우선
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
 * 검색어와 이름이 일치/포함되는 장소를 pool(로컬 DB 캐시) 안에서 찾음
 * 완전 일치 우선, 없으면 부분 포함 첫 번째 결과
 */
function findMatchInPool(query: string, pool: DbPlace[]): DbPlace | null {
  const q = query.trim();
  if (!q) return null;
  const exact = pool.find((p) => p.name === q);
  if (exact) return exact;
  const partial = pool.find((p) => p.name.includes(q));
  return partial ?? null;
}

/**
 * 검색어로 기준점을 찾고, 그 기준점의 연관장소(RANK순) + 혼밥식당(거리순)을 합쳐 반환.
 * relatedPlaces와 soloRestaurants를 분리해서 반환하는 이유:
 *   - "연관순위" 정렬 시 각각 다른 기준(RANK vs 거리)으로 정렬한 뒤 이어붙여야 하기 때문
 */

export async function searchAndGetResults(
  query: string,
  region: PlaceRegion,
  pool: DbPlace[],
): Promise<{
  referenceSpot: ReferenceSpot | null;
  relatedPlaces: DbPlace[];
  soloRestaurants: DbPlace[];
}> {
  const matched = findMatchInPool(query, pool);
  if (!matched) {
    return { referenceSpot: null, relatedPlaces: [], soloRestaurants: [] };
  }

  const supabase = createClient();
  const prefix = REGION_TABLE_PREFIX[region];

  const { data: hubCheck } = await supabase
    .from(`T_${prefix}_SPOT`)
    .select('"SPOT_ID"')
    .eq('"SPOT_ID"', matched.id)
    .maybeSingle();

  const referenceSpot: ReferenceSpot = {
    id: matched.id,
    name: matched.name,
    lat: matched.lat,
    lng: matched.lng,
    isHub: !!hubCheck,
  };

  let centerSpotId = matched.id;

  if (!hubCheck) {
    const { data: hubs } = await supabase
      .from(`T_${prefix}_SPOT`)
      .select('"SPOT_ID","LATITUDE","LONGITUDE"')
      .not('"LATITUDE"', "is", null);

    const nearest = [...(hubs ?? [])].sort(
      (a: any, b: any) =>
        haversineKm(a.LATITUDE, a.LONGITUDE, matched.lat, matched.lng) -
        haversineKm(b.LATITUDE, b.LONGITUDE, matched.lat, matched.lng),
    )[0] as any;

    centerSpotId = nearest?.SPOT_ID;
    if (!centerSpotId) {
      return { referenceSpot, relatedPlaces: [], soloRestaurants: pool.filter((p) => p.soloFriendly) };
    }
  }

  // 연관장소 (RANK순)
  const { data: relations } = await supabase
    .from(`T_${prefix}_RELATED_SPOT`)
    .select('"RELATED_SPOT_ID","RELATED_SPOT_NAME","RELATED_CATEGORY","LATITUDE","LONGITUDE","RANK"')
    .eq('"CENTER_SPOT_ID"', centerSpotId)
    .order('"RANK"', { ascending: true });

  const poolById = new Map(pool.map((p) => [p.id, p]));

  const relatedPlaces: DbPlace[] = (relations ?? [])
    .filter((r: any) => r.LATITUDE != null)
    .map((r: any) => poolById.get(r.RELATED_SPOT_ID) ?? {
      id: r.RELATED_SPOT_ID,
      name: r.RELATED_SPOT_NAME,
      category: categorizeSpot(r.RELATED_CATEGORY),
      lat: r.LATITUDE,
      lng: r.LONGITUDE,
      soloFriendly: false,
      ageGroups: [],
    });

  // 혼밥식당은 연관장소 테이블과 무관하게 전체를 대상 (지역 pool 안에서 soloFriendly만 추출)
  const soloRestaurants = pool.filter((p) => p.soloFriendly);

  return { referenceSpot, relatedPlaces, soloRestaurants };
}