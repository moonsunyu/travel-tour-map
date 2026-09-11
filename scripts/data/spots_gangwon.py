import os
import glob
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

# .env 파일 로드
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

TABLE = "T_GANGWON_SPOT"
DATA_DIR = os.path.join(os.path.dirname(__file__), "gangwon", "raw", "gangwon_spot")

COLUMN_MAP = {
    "관광지ID": "SPOT_ID",
    "중심관광지명": "SPOT_NAME",
    "중심카테고리 명_중": "CATEGORY",
    "중심시도명": "SIDO",
    "중심시군구명": "SIGUNGU",
}


def load_csv_records(csv_path):
    # utf-8-sig 또는 cp949 인코딩 처리
    try:
        df = pd.read_csv(csv_path, encoding="utf-8-sig")
    except UnicodeDecodeError:
        df = pd.read_csv(csv_path, encoding="cp949")

    # 필요한 컬럼 매핑
    df = df.rename(columns=COLUMN_MAP)

    # 문자열 타입 보장 및 공백 정리
    df["SPOT_ID"] = df["SPOT_ID"].astype(str).str.strip()
    df["SPOT_NAME"] = df["SPOT_NAME"].astype(str).str.strip()

    # 결측치(NaN)를 None으로 변환하여 DB에 NULL로 들어가도록 처리
    target_columns = ["SPOT_ID", "SPOT_NAME", "CATEGORY", "SIDO", "SIGUNGU"]
    filtered_df = df[target_columns].drop_duplicates(subset=["SPOT_ID"])
    filtered_df = filtered_df.where(pd.notnull(filtered_df), None)

    return filtered_df.to_dict("records")


def main():
    csv_files = sorted(glob.glob(os.path.join(DATA_DIR, "*.csv")))
    if not csv_files:
        print(f"CSV 파일 없음: {DATA_DIR}")
        return

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("에러: .env에 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.")
        return

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    total = 0
    for csv_path in csv_files:
        records = load_csv_records(csv_path)
        if not records:
            continue

        # T_GANGWON_SPOT의 PK는 SPOT_ID이므로 on_conflict="SPOT_ID" 지정
        client.table(TABLE).upsert(records, on_conflict="SPOT_ID").execute()
        total += len(records)
        print(f"{os.path.basename(csv_path)} -> {len(records)}행 upsert 완료")

    print(f"총 {total}행 적재 완료 (TABLE={TABLE})")


if __name__ == "__main__":
    main()