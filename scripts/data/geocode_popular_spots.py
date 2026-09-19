# scripts/geocode_popular_spots.py
import os
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")  

TABLE = "T_GANGWON_POPULAR_SPOT"


def search_coordinates(keyword, region_hint=""):
    """카카오 키워드 검색으로 좌표 조회"""
    url = "https://dapi.kakao.com/v2/local/search/keyword.json"
    headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
    query = f"{region_hint} {keyword}".strip()
    params = {"query": query}

    res = requests.get(url, headers=headers, params=params)
    res.raise_for_status()
    documents = res.json().get("documents", [])

    if not documents:
        return None, None
    return float(documents[0]["y"]), float(documents[0]["x"])


def main():
    if not KAKAO_REST_API_KEY:
        raise ValueError("KAKAO_REST_API_KEY가 .env에 없습니다.")

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # 1. 좌표 없는 행 전체 조회 (SPOT_ID, SPOT_NAME만 필요)
    result = (
        client.table(TABLE)
        .select("SPOT_ID, SPOT_NAME")
        .is_("LATITUDE", "null")
        .execute()
    )
    rows = result.data
    print(f"좌표 없는 행 {len(rows)}건 조회됨")

    # 2. SPOT_ID 기준으로 중복 제거 (같은 장소가 연령대별로 여러 행 존재하므로)
    unique_spots = {row["SPOT_ID"]: row["SPOT_NAME"] for row in rows}
    print(f"중복 제거 후 실제 지오코딩할 장소: {len(unique_spots)}곳")

    success, failed = 0, []

    # 3. 고유 장소마다 딱 한 번씩만 API 호출
    for spot_id, spot_name in unique_spots.items():
        lat, lng = search_coordinates(spot_name, region_hint="강원도")

        if lat is None:
            print(f"  ⚠️  못 찾음: {spot_name} ({spot_id})")
            failed.append(spot_name)
            continue

        # 4. 이 SPOT_ID를 가진 모든 행(연령대별 전부)에 한 번에 반영
        client.table(TABLE).update(
            {"LATITUDE": lat, "LONGITUDE": lng}
        ).eq("SPOT_ID", spot_id).execute()

        success += 1
        print(f"  ✓ {spot_name} → ({lat}, {lng})")
        time.sleep(0.1)

    print(f"\n완료: 고유 장소 {success}곳 성공, {len(failed)}곳 실패")
    if failed:
        print("실패 목록:", failed)


if __name__ == "__main__":
    main()