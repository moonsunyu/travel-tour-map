// lib/places.ts

import { createClient } from "@/lib/supabase/client";   
import { haversineKm } from "@/lib/geo";
import { kakaoKeywordSearch } from "@/lib/kakaoSearch";

export type PlaceRegion = "강원도" | "여수";
export type PlaceCategory = "음식점" | "관광명소" | "숙박";
export type AgeGroupFilter = "전체" | "20" | "30" | "40" | "50" | "60";

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

const REGION_TABLE_PREFIX: Record<PlaceRegion, string> = {
  강원도: "GANGWON",
  여수: "YEOSU",
};

async function fetchAgeGroupMap(prefix: string): Promise<Map<string, string[]>> {
  const supabase = createClient();   // ← await 없음 (server.ts와의 차이)
  const { data } = await supabase
    .from(`T_${prefix}_POPULAR_SPOT`)
    .select('"SPOT_ID","AGE_GROUP"')
    .neq('"AGE_GROUP"', "전체");

  const map = new Map<string, string[]>();
  (data ?? []).forEach((row: any) => {
    const list = map.get(row.SPOT_ID) ?? [];
    if (!list.includes(row.AGE_GROUP)) list.push(row.AGE_GROUP);
    map.set(row.SPOT_ID, list);
  });
  return map;
}

function categorizeSpot(raw: string | null | undefined): PlaceCategory {
  const value = (raw ?? "").trim();
  if (/음식|카페|맛집|식당|레스토랑|디저트/.test(value)) return "음식점";
  return "관광명소";
}

export async function fetchRegionPlaces(region: PlaceRegion): Promise<DbPlace[]> {
  const supabase = createClient();
  const prefix = REGION_TABLE_PREFIX[region];
  const ageGroupMap = await fetchAgeGroupMap(prefix);

  const { data: spots, error: spotsError } = await supabase
    .from(`T_${prefix}_SPOT`)
    .select('"SPOT_ID","SPOT_NAME","CATEGORY","LATITUDE","LONGITUDE"')
    .not('"LATITUDE"', "is", null);

    console.log("spots 조회 결과:", spots?.length, "에러:", spotsError); 

  const spotPlaces: DbPlace[] = (spots ?? []).map((s: any) => ({
    id: s.SPOT_ID,
    name: s.SPOT_NAME,
    category: categorizeSpot(s.CATEGORY),
    lat: s.LATITUDE,
    lng: s.LONGITUDE,
    soloFriendly: false,
    ageGroups: ageGroupMap.get(s.SPOT_ID) ?? [],
  }));

  const { data: lodgings } = await supabase
    .from(`T_${prefix}_RELATED_SPOT`)
    .select('"RELATED_SPOT_ID","RELATED_SPOT_NAME","LATITUDE","LONGITUDE"')
    .eq('"RELATED_CATEGORY"', "숙박")
    .not('"LATITUDE"', "is", null);

  const lodgingMap = new Map<string, DbPlace>();
  (lodgings ?? []).forEach((l: any) => {
    if (!lodgingMap.has(l.RELATED_SPOT_ID)) {
      lodgingMap.set(l.RELATED_SPOT_ID, {
        id: l.RELATED_SPOT_ID,
        name: l.RELATED_SPOT_NAME,
        category: "숙박",
        lat: l.LATITUDE,
        lng: l.LONGITUDE,
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

  const merged = new Map<string, DbPlace>();
  spotPlaces.forEach((p) => merged.set(p.id, p));
  Array.from(lodgingMap.values()).forEach((p) => merged.set(p.id, p));
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

export async function searchAndIntersect(
  query: string,
  region: PlaceRegion,
  pool: DbPlace[],
): Promise<DbPlace[]> {
  const kakaoResults = await kakaoKeywordSearch(`${region} ${query}`);
  console.log("카카오 검색 결과 수:", kakaoResults.length);  // ← 추가

  const matched: DbPlace[] = [];
  kakaoResults.forEach((kp) => {
    const kLat = Number(kp.y);
    const kLng = Number(kp.x);
    const hit = pool.find(
      (p) => p.name === kp.place_name || haversineKm(p.lat, p.lng, kLat, kLng) < 0.03,
    );
    if (hit && !matched.find((m) => m.id === hit.id)) matched.push(hit);
  });
  console.log("DB 교집합 매칭 수:", matched.length);  // ← 추가
  return matched;
}

export async function extractReferenceSpot(
  matched: DbPlace[],
  region: PlaceRegion,
): Promise<ReferenceSpot | null> {
  if (matched.length === 0) return null;

  const supabase = createClient();
  const prefix = REGION_TABLE_PREFIX[region];
  const landmark = matched.find((p) => p.category === "관광명소");

  if (landmark) {
    const { data } = await supabase
      .from(`T_${prefix}_SPOT`)
      .select('"SPOT_ID"')
      .eq('"SPOT_ID"', landmark.id)
      .maybeSingle();
    return { id: landmark.id, name: landmark.name, lat: landmark.lat, lng: landmark.lng, isHub: !!data };
  }

  const avgLat = matched.reduce((s, p) => s + p.lat, 0) / matched.length;
  const avgLng = matched.reduce((s, p) => s + p.lng, 0) / matched.length;
  return { id: "", name: matched[0].name, lat: avgLat, lng: avgLng, isHub: false };
}

export async function sortByRelation(
  places: DbPlace[],
  reference: ReferenceSpot,
  region: PlaceRegion,
): Promise<DbPlace[]> {
  const supabase = createClient();
  const prefix = REGION_TABLE_PREFIX[region];
  let centerSpotId = reference.id;

  if (!reference.isHub) {
    const { data: hubs } = await supabase
      .from(`T_${prefix}_SPOT`)
      .select('"SPOT_ID","LATITUDE","LONGITUDE"')
      .not('"LATITUDE"', "is", null);

    const nearest = [...(hubs ?? [])].sort(
      (a: any, b: any) =>
        haversineKm(a.LATITUDE, a.LONGITUDE, reference.lat, reference.lng) -
        haversineKm(b.LATITUDE, b.LONGITUDE, reference.lat, reference.lng),
    )[0] as any;

    centerSpotId = nearest?.SPOT_ID;
    if (!centerSpotId) return places;
  }

  const { data: relations } = await supabase
    .from(`T_${prefix}_RELATED_SPOT`)
    .select('"RELATED_SPOT_ID","RANK"')
    .eq('"CENTER_SPOT_ID"', centerSpotId)
    .order('"RANK"', { ascending: true });

  const rankMap = new Map<string, number>();
  (relations ?? []).forEach((r: any) => rankMap.set(r.RELATED_SPOT_ID, r.RANK));

  return [...places].sort((a, b) => {
    const ra = rankMap.get(a.id) ?? Infinity;
    const rb = rankMap.get(b.id) ?? Infinity;
    return ra - rb;
  });
}