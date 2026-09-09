import os
import uuid

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

TABLE = "T_YEOSU_SOLO_RESTAURANT"
REGION = "여수"
XLSX_PATH = os.path.join(
    os.path.dirname(__file__),
    "data", "raw", "yeosu_solo_restaurant",
    "여수시 혼밥식당 지정업소(2025+2026).xlsx",
)
SHEET_NAME = "거리별"
HEADER_ROW = 1  # 실제 컬럼명은 2번째 행(0-index 1)

COLUMN_MAP = {
    "거리별": "DISTRICT",
    "업소명": "STORE_NAME",
    "주소": "ADDRESS",
    "주요1인메뉴": "MAIN_SOLO_MENU",
    "제외메뉴": "EXCLUDED_MENU",
}

# 개인정보 컬럼(영업주, 휴대폰), 원본 연번(SEQ_NO, 의미 없는 값), 비고(NOTE, 89행 전부 빈 값)는
# 의도적으로 COLUMN_MAP에 없어 아래 select에서 자연히 제외된다.
OUTPUT_COLUMNS = ["REGION", "DISTRICT", "STORE_NAME", "ADDRESS", "MAIN_SOLO_MENU", "EXCLUDED_MENU"]


def load_records():
    df = pd.read_excel(XLSX_PATH, sheet_name=SHEET_NAME, header=HEADER_ROW)
    df = df.rename(columns=COLUMN_MAP)
    df["REGION"] = REGION
    df = df[OUTPUT_COLUMNS]
    # object dtype으로 바꾼 뒤 치환해야 float 컬럼에서 None이 다시 NaN으로 돌아가지 않는다.
    df = df.astype(object).where(df.notna(), None)
    return df.to_dict("records")


def fetch_food_spot_id_map(client):
    """T_YEOSU_RELATED_SPOT(구분=음식)에서 업소명 -> SPOT_ID(연관관광지ID) 매핑을 만든다.
    이름이 겹치는 극소수(87곳 중 9곳 수준) 혼밥식당만 실제로 값이 채워지고, 나머지는 None으로 남는다."""
    name_to_id = {}
    start = 0
    page = 1000
    while True:
        res = (
            client.table("T_YEOSU_RELATED_SPOT")
            .select("RELATED_SPOT_ID,RELATED_SPOT_NAME")
            .eq("RELATED_CATEGORY", "음식")
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
    """(STORE_NAME, ADDRESS) -> 이미 저장된 SPOT_ID. 재실행 시 무작위 생성값이 매번
    바뀌지 않고 안정적으로 유지되도록 하기 위함."""
    existing = {}
    start = 0
    page = 1000
    while True:
        res = (
            client.table(TABLE)
            .select("STORE_NAME,ADDRESS,SPOT_ID")
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
            # 연관관광지(음식) 데이터와 이름이 일치하면 항상 최신 값으로 동기화한다.
            spot_id = food_match
            matched += 1
        elif key in existing_spot_id_map:
            # 이미 들어있는 행이면 예전에 생성해둔 무작위 값을 그대로 유지한다.
            spot_id = existing_spot_id_map[key]
        else:
            # 처음 보는 행이고 일치하는 데이터랩 ID도 없으면, 같은 형식(대시 없는 32자리
            # 16진수)의 무작위 값을 새로 만든다.
            spot_id = uuid.uuid4().hex
        record["SPOT_ID"] = spot_id

    client.table(TABLE).upsert(records, on_conflict="STORE_NAME,ADDRESS").execute()
    print(f"{len(records)}행 upsert 완료 (REGION={REGION}, SPOT_ID 매칭 {matched}건, 나머지는 기존값 유지/무작위 생성)")


if __name__ == "__main__":
    main()
