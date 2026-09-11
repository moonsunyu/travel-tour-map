import os
import uuid

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

TABLE = "T_GANGWON_SOLO_RESTAURANT"
REGION = "강원도"
XLSX_PATH = os.path.join(
    os.path.dirname(__file__),
    "gangwon", "raw", "gangwon_solo_restaurant",
    "solo_restaurants_gangwon.xlsx",
)
SHEET_NAME = "1인 관광객 환영업소"
HEADER_ROW = 1  # 2번째 행(index 1)이 실제 헤더

# 강원도 엑셀 컬럼 매핑
COLUMN_MAP = {
    "소재지": "DISTRICT",
    "업소명": "STORE_NAME",
    "주소": "ADDRESS",
    "주요1인 메뉴": "MAIN_SOLO_MENU",
    "제외메뉴": "EXCLUDED_MENU",
}

OUTPUT_COLUMNS = ["REGION", "DISTRICT", "STORE_NAME", "ADDRESS", "MAIN_SOLO_MENU", "EXCLUDED_MENU"]


def load_records():
    if not os.path.exists(XLSX_PATH):
        raise FileNotFoundError(f"엑셀 파일 없음: {XLSX_PATH}")

    df = pd.read_excel(XLSX_PATH, sheet_name=SHEET_NAME, header=HEADER_ROW)
    df = df.rename(columns=COLUMN_MAP)
    df["REGION"] = REGION

    # 문자열 좌우 공백 정리
    df["STORE_NAME"] = df["STORE_NAME"].astype(str).str.strip()
    df["ADDRESS"] = df["ADDRESS"].astype(str).str.strip()

    df = df[OUTPUT_COLUMNS]
    # object dtype으로 바꾼 뒤 치환해야 float/NaN 컬럼이 None(DB NULL)으로 유지됨
    df = df.astype(object).where(df.notna(), None)
    return df.to_dict("records")


def fetch_food_spot_id_map(client):
    """T_GANGWON_SPOT 및 T_GANGWON_RELATED_SPOT에서 업소명 -> SPOT_ID 매핑 생성.
    기존 관광지명과 일치하는 혼밥식당에 해당 SPOT_ID를 부여합니다."""
    name_to_id = {}

    # 1. 중심 관광지(T_GANGWON_SPOT) 조회
    start = 0
    page = 1000
    while True:
        res = (
            client.table("T_GANGWON_SPOT")
            .select("SPOT_ID, SPOT_NAME")
            .range(start, start + page - 1)
            .execute()
        )
        for row in res.data:
            name_to_id.setdefault(row["SPOT_NAME"].strip(), row["SPOT_ID"])
        if len(res.data) < page:
            break
        start += page

    # 2. 연관 관광지(T_GANGWON_RELATED_SPOT - 구분=음식 또는 전체) 조회
    start = 0
    while True:
        res = (
            client.table("T_GANGWON_RELATED_SPOT")
            .select("RELATED_SPOT_ID, RELATED_SPOT_NAME")
            .range(start, start + page - 1)
            .execute()
        )
        for row in res.data:
            name_to_id.setdefault(row["RELATED_SPOT_NAME"].strip(), row["RELATED_SPOT_ID"])
        if len(res.data) < page:
            break
        start += page

    return name_to_id


def fetch_existing_spot_id_map(client):
    """(STORE_NAME, ADDRESS) -> 이미 저장된 SPOT_ID.
    스크립트를 재실행하더라도 기존에 생성된 무작위 UUID가 바뀌지 않고 안정적으로 유지되도록 함."""
    existing = {}
    start = 0
    page = 1000
    while True:
        res = (
            client.table(TABLE)
            .select("STORE_NAME, ADDRESS, SPOT_ID")
            .range(start, start + page - 1)
            .execute()
        )
        for row in res.data:
            existing[(row["STORE_NAME"].strip(), row["ADDRESS"].strip())] = row["SPOT_ID"]
        if len(res.data) < page:
            break
        start += page
    return existing


def main():
    records = load_records()
    if not records:
        print(f"레코드 없음: {XLSX_PATH}")
        return

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    food_spot_id_map = fetch_food_spot_id_map(client)
    existing_spot_id_map = fetch_existing_spot_id_map(client)

    matched = 0
    for record in records:
        key = (record["STORE_NAME"].strip(), record["ADDRESS"].strip())
        food_match = food_spot_id_map.get(key[0])

        if food_match:
            # 기존 관광지(중심/연관)와 상호명이 일치하면 해당 ID로 동기화
            spot_id = food_match
            matched += 1
        elif key in existing_spot_id_map:
            # 이미 등록된 식당이면 과거에 발급했던 SPOT_ID 유지
            spot_id = existing_spot_id_map[key]
        else:
            # 신규 식당이면 32자리 UUID 16진수 신규 생성
            spot_id = uuid.uuid4().hex

        record["SPOT_ID"] = spot_id

    client.table(TABLE).upsert(records, on_conflict="STORE_NAME,ADDRESS").execute()
    print(f"{len(records)}행 upsert 완료 (REGION={REGION}, SPOT_ID 매칭 {matched}건, 나머지는 기존값 유지/무작위 생성)")


if __name__ == "__main__":
    main()
    
