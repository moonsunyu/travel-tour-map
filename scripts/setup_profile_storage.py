import os

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

BUCKET = "profile-images"
DEFAULT_IMAGE_PATH = "default.svg"

# 지정된 기본 이미지가 없어 간단한 회색 원+사람 아이콘 SVG를 기본 아바타로 사용한다.
# docs/plans/2026-09-14-user-profile-account-api.md §6-1 가정.
DEFAULT_AVATAR_SVG = b"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <circle cx="64" cy="64" r="64" fill="#D1D5DB"/>
  <circle cx="64" cy="50" r="24" fill="#9CA3AF"/>
  <path d="M20 116c6-28 30-40 44-40s38 12 44 40" fill="#9CA3AF"/>
</svg>
"""


def main():
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    buckets = [b.name for b in client.storage.list_buckets()]
    if BUCKET not in buckets:
        client.storage.create_bucket(
            BUCKET,
            options={"public": True, "file_size_limit": 5 * 1024 * 1024, "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]},
        )
        print(f"버킷 생성 완료: {BUCKET} (public)")
    else:
        print(f"버킷 이미 존재: {BUCKET}")

    client.storage.from_(BUCKET).upload(
        DEFAULT_IMAGE_PATH,
        DEFAULT_AVATAR_SVG,
        file_options={"content-type": "image/svg+xml", "upsert": "true"},
    )
    public_url = client.storage.from_(BUCKET).get_public_url(DEFAULT_IMAGE_PATH)
    print(f"기본 아바타 업로드 완료: {public_url}")


if __name__ == "__main__":
    main()
