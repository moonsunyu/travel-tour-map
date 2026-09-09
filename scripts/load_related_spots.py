import os
import glob

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

SPOT_TABLE = "T_YEOSU_SPOT"
RELATED_TABLE = "T_YEOSU_RELATED_SPOT"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "raw", "yeosu_related_spot_202507-202606")

CENTER_COLUMN_MAP = {
    "중심관광지ID": "SPOT_ID",
    "중심관광지명": "SPOT_NAME",
    "중심카테고리 명_중": "CATEGORY",
    "중심시도명": "SIDO",
    "중심시군구명": "SIGUNGU",
}

RELATED_COLUMN_MAP = {
    "중심관광지ID": "CENTER_SPOT_ID",
    "순위": "RANK",
    "연관관광지ID": "RELATED_SPOT_ID",
    "연관관광지명": "RELATED_SPOT_NAME",
    "연관관광지시도명": "RELATED_SIDO",
    "연관관광지시군구명": "RELATED_SIGUNGU",
    "구분": "RELATED_CATEGORY",
}


def load_dataframes():
    csv_files = sorted(glob.glob(os.path.join(DATA_DIR, "*.csv")))
    if not csv_files:
        raise FileNotFoundError(f"CSV 파일 없음: {DATA_DIR}")
    return [pd.read_csv(fp, encoding="utf-8-sig") for fp in csv_files]


def build_spot_records(dataframes):
    spots = {}
    for df in dataframes:
        first = df.iloc[0]
        row = {new: first[old] for old, new in CENTER_COLUMN_MAP.items()}
        spots[row["SPOT_ID"]] = row
    return list(spots.values())


def build_related_records(dataframes):
    records = []
    for df in dataframes:
        renamed = df.rename(columns=RELATED_COLUMN_MAP)
        renamed = renamed[list(RELATED_COLUMN_MAP.values())]
        renamed = renamed.astype(object).where(renamed.notna(), None)
        records.extend(renamed.to_dict("records"))
    return records


def main():
    dataframes = load_dataframes()
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    spot_records = build_spot_records(dataframes)
    client.table(SPOT_TABLE).upsert(spot_records, on_conflict="SPOT_ID").execute()
    print(f"{SPOT_TABLE}: {len(spot_records)}행 upsert 완료")

    related_records = build_related_records(dataframes)
    # FK/유니크 제약과 무관하게 한 번에 보내되, 너무 큰 페이로드를 피하려고 파일 단위(50행)로 나눠 보낸다.
    chunk_size = 200
    total = 0
    for i in range(0, len(related_records), chunk_size):
        chunk = related_records[i:i + chunk_size]
        client.table(RELATED_TABLE).upsert(chunk, on_conflict="CENTER_SPOT_ID,RELATED_SPOT_ID").execute()
        total += len(chunk)
    print(f"{RELATED_TABLE}: {total}행 upsert 완료")


if __name__ == "__main__":
    main()
