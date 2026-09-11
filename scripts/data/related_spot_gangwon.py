import os
import glob

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

# .env 파일 로드
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# 강원도 테이블 및 데이터 경로 설정
SPOT_TABLE = "T_GANGWON_SPOT"
RELATED_TABLE = "T_GANGWON_RELATED_SPOT"
DATA_DIR = os.path.join(os.path.dirname(__file__), "gangwon", "raw", "gangwon_related")

# 1. 중심 관광지 정보 매핑 (T_GANGWON_SPOT 적재용)
CENTER_COLUMN_MAP = {
    "중심관광지ID": "SPOT_ID",
    "중심관광지명": "SPOT_NAME",
    "중심카테고리 명_중": "CATEGORY",
    "중심시도명": "SIDO",
    "중심시군구명": "SIGUNGU",
}

# 2. 연관 관광지 정보 매핑 (T_GANGWON_RELATED_SPOT 적재용)
RELATED_COLUMN_MAP = {
    "중심관광지ID": "CENTER_SPOT_ID",
    "순위": "RANK",
    "연관관광지ID": "RELATED_SPOT_ID",
    "연관관광지명": "RELATED_SPOT_NAME",
    "연관관광지시도명": "RELATED_SIDO",
    "연관관광지시군구명": "RELATED_SIGUNGU",
    "구분": "RELATED_CATEGORY",
}


def read_csv_safe(file_path):
    """인코딩(utf-8-sig 또는 cp949)을 자동 판별하여 읽어옵니다."""
    try:
        return pd.read_csv(file_path, encoding="utf-8-sig")
    except UnicodeDecodeError:
        return pd.read_csv(file_path, encoding="cp949")


def load_dataframes():
    csv_files = sorted(glob.glob(os.path.join(DATA_DIR, "*.csv")))
    if not csv_files:
        raise FileNotFoundError(f"CSV 파일 없음: {DATA_DIR}")
    return [read_csv_safe(fp) for fp in csv_files]


def build_spot_records(dataframes):
    """각 CSV의 첫 행에서 중심 관광지 정보를 뽑아 중복 없이 목록을 만듭니다."""
    spots = {}
    for df in dataframes:
        if df.empty:
            continue
        first = df.iloc[0]
        # CSV에 컬럼이 있는 경우에만 매핑 (결측치 대비)
        row = {
            new: str(first[old]).strip() if pd.notna(first[old]) else None
            for old, new in CENTER_COLUMN_MAP.items()
            if old in df.columns
        }
        if "SPOT_ID" in row and row["SPOT_ID"]:
            spots[row["SPOT_ID"]] = row
    return list(spots.values())


def build_related_records(dataframes):
    """연관 관광지 데이터 행들을 추출하고 None 처리를 진행합니다."""
    records = []
    for df in dataframes:
        if df.empty:
            continue
        renamed = df.rename(columns=RELATED_COLUMN_MAP)
        
        # 존재하는 매핑 컬럼만 선택
        valid_cols = [col for col in RELATED_COLUMN_MAP.values() if col in renamed.columns]
        renamed = renamed[valid_cols]

        # 문자열 공백 정리
        if "CENTER_SPOT_ID" in renamed.columns:
            renamed["CENTER_SPOT_ID"] = renamed["CENTER_SPOT_ID"].astype(str).str.strip()
        if "RELATED_SPOT_ID" in renamed.columns:
            renamed["RELATED_SPOT_ID"] = renamed["RELATED_SPOT_ID"].astype(str).str.strip()

        # 복합 PK 기준 중복 제거
        if "CENTER_SPOT_ID" in renamed.columns and "RELATED_SPOT_ID" in renamed.columns:
            renamed = renamed.drop_duplicates(subset=["CENTER_SPOT_ID", "RELATED_SPOT_ID"])

        # NaN 결측치를 DB의 NULL에 대응되도록 None 처리
        renamed = renamed.astype(object).where(renamed.notna(), None)
        records.extend(renamed.to_dict("records"))
    return records


def main():
    dataframes = load_dataframes()
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError(".env 파일의 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY를 확인하세요.")

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # 1. 중심 관광지 적재 (PK: SPOT_ID)
    spot_records = build_spot_records(dataframes)
    if spot_records:
        client.table(SPOT_TABLE).upsert(spot_records, on_conflict="SPOT_ID").execute()
        print(f"{SPOT_TABLE}: {len(spot_records)}행 upsert 완료")

    # 2. 연관 관광지 적재 (PK: CENTER_SPOT_ID, RELATED_SPOT_ID)
    related_records = build_related_records(dataframes)
    
    # 대량 데이터 전송 시 안정성을 위해 200개씩 chunk 분할 전송
    chunk_size = 200
    total = 0
    for i in range(0, len(related_records), chunk_size):
        chunk = related_records[i : i + chunk_size]
        client.table(RELATED_TABLE).upsert(
            chunk, on_conflict="CENTER_SPOT_ID,RELATED_SPOT_ID"
        ).execute()
        total += len(chunk)

    print(f"{RELATED_TABLE}: {total}행 upsert 완료")


if __name__ == "__main__":
    main()