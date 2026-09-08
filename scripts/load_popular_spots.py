import os
import re
import glob

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

TABLE = "T_YEOSU_POPULAR_SPOT"
REGION = "여수"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "raw", "yeosu_popular_spot_202507-202606")

COLUMN_MAP = {
    "순위": "RANK",
    "관광지ID": "SPOT_ID",
    "관심지점명": "SPOT_NAME",
    "구분": "CATEGORY",
    "연령대": "AGE_GROUP",
    "비율": "RATIO",
}


def period_label_from_dirname(dir_path):
    match = re.search(r"(\d{6})-(\d{6})", os.path.basename(dir_path))
    if not match:
        raise ValueError(f"디렉터리명에서 기간을 찾을 수 없음: {dir_path}")
    return f"{match.group(1)}~{match.group(2)}"


def load_csv_records(csv_path, period_label):
    df = pd.read_csv(csv_path, encoding="utf-8-sig")
    df = df.rename(columns=COLUMN_MAP)
    df["AGE_GROUP"] = df["AGE_GROUP"].astype(str)
    df["REGION"] = REGION
    df["PERIOD_LABEL"] = period_label
    return df[["REGION", "PERIOD_LABEL", "AGE_GROUP", "SPOT_ID", "RANK", "SPOT_NAME", "CATEGORY", "RATIO"]].to_dict("records")


def main():
    period_label = period_label_from_dirname(DATA_DIR)
    csv_files = sorted(glob.glob(os.path.join(DATA_DIR, "*.csv")))
    if not csv_files:
        print(f"CSV 파일 없음: {DATA_DIR}")
        return

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    total = 0
    for csv_path in csv_files:
        records = load_csv_records(csv_path, period_label)
        client.table(TABLE).upsert(records, on_conflict="REGION,PERIOD_LABEL,AGE_GROUP,SPOT_ID").execute()
        total += len(records)
        print(f"{os.path.basename(csv_path)} -> {len(records)}행 upsert 완료")

    print(f"총 {total}행 적재 완료 (REGION={REGION}, PERIOD_LABEL={period_label})")


if __name__ == "__main__":
    main()
