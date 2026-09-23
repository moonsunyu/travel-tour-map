# scripts/data/geocode_all.py
import os
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")


TABLE_CONFIGS = [
    {
        "table": "T_GANGWON_POPULAR_SPOT",
        "id_col": "SPOT_ID",
        "name_col": "SPOT_NAME",
        "region_hint": "강원도",
    },
    
    {
        "table": "T_GANGWON_SPOT",
        "id_col": "SPOT_ID",
        "name_col": "SPOT_NAME",
        "region_hint": "강원도",
    },
    
    {
        "table": "T_GANGWON_RELATED_SPOT",
        "id_col": "RELATED_SPOT_ID",
        "name_col": "RELATED_SPOT_NAME",
        "region_hint": "강원도",
    },

    {
        "table": "T_GANGWON_SOLO_RESTAURANT",
        "id_col": "ID",
        "name_col": "STORE_NAME",
        "region_hint": "강원도",
    },
    
    {
        "table": "T_YEOSU_SPOT",
        "id_col": "SPOT_ID",
        "name_col": "SPOT_NAME",
        "region_hint": "여수",
    },
    
    {
        "table": "T_YEOSU_POPULAR_SPOT",
        "id_col": "SPOT_ID",
        "name_col": "SPOT_NAME",
        "region_hint": "여수",
    },
    
    {
        "table": "T_YEOSU_RELATED_SPOT",
        "id_col": "RELATED_SPOT_ID",
        "name_col": "RELATED_SPOT_NAME",
        "region_hint": "여수",
    },

    {
        "table": "T_YEOSU_SOLO_RESTAURANT",
        "id_col": "SPOT_ID",
        "name_col": "STORE_NAME",
        "region_hint": "여수",
    },
    
]


def search_coordinates(client_kakao_key, keyword, region_hint=""):
    url = "https://dapi.kakao.com/v2/local/search/keyword.json"
    headers = {"Authorization": f"KakaoAK {client_kakao_key}"}
    query = f"{region_hint} {keyword}".strip()
    res = requests.get(url, headers=headers, params={"query": query})
    res.raise_for_status()
    documents = res.json().get("documents", [])
    if not documents:
        return None, None
    return float(documents[0]["y"]), float(documents[0]["x"])


def geocode_table(client, config):
    table = config["table"]
    id_col = config["id_col"]
    name_col = config["name_col"]
    region_hint = config["region_hint"]

    print(f"\n{'='*50}\n{table} 처리 시작\n{'='*50}")

    result = (
        client.table(table)
        .select(f"{id_col}, {name_col}")
        .is_("LATITUDE", "null")
        .execute()
    )
    rows = result.data
    unique_spots = {row[id_col]: row[name_col] for row in rows}
    print(f"좌표 없는 고유 장소 {len(unique_spots)}건 발견")

    success, failed = 0, []
    for spot_id, name in unique_spots.items():
        lat, lng = search_coordinates(KAKAO_REST_API_KEY, name, region_hint)

        if lat is None:
            print(f"  ⚠️  못 찾음: {name}")
            failed.append(name)
            continue

        client.table(table).update(
            {"LATITUDE": lat, "LONGITUDE": lng}
        ).eq(id_col, spot_id).execute()

        success += 1
        print(f"  ✓ {name} → ({lat}, {lng})")
        time.sleep(0.1)

    print(f"{table} 완료: {success}건 성공, {len(failed)}건 실패")
    if failed:
        print("  실패 목록:", failed)

    return success, failed


def main():
    if not KAKAO_REST_API_KEY:
        raise ValueError("KAKAO_REST_API_KEY가 .env에 없습니다.")

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    summary = {}
    for config in TABLE_CONFIGS:
        success, failed = geocode_table(client, config)
        summary[config["table"]] = {"success": success, "failed": len(failed)}

    print(f"\n{'='*50}\n전체 요약\n{'='*50}")
    for table, result in summary.items():
        print(f"{table}: 성공 {result['success']}건, 실패 {result['failed']}건")


if __name__ == "__main__":
    main()