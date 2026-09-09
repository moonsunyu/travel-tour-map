# 계획서: 여수시 혼밥식당 지정업소 xlsx → Supabase(PostgreSQL) 저장

- 작성일: 2026-09-09
- 관련 데이터: `scripts/data/raw/yeosu_solo_restaurant/여수시 혼밥식당 지정업소(2025+2026).xlsx`
- 근거: `.claude/skills/db-development-postgres`, [`2026-09-08-tourdata-supabase-storage.md`](2026-09-08-tourdata-supabase-storage.md)(선행 작업 — 동일 패턴 재사용)

## 1. 무엇을 (What)

여수시가 지정한 "혼밥(1인)식당" 업소 리스트를 Supabase PostgreSQL에 저장한다.
기획 스택의 "인증업소 DB" 요구사항에 해당하는 데이터.

## 2. 데이터 확인 결과

- 원본 xlsx에 시트가 2개(`거리별`, `먹거리별`) 있었으나, 두 시트가 **같은 87개 업소**를 지역/음식분류
  기준으로 각각 정리한 것으로 확인되어(교집합 87/87 일치) 사용자가 `먹거리별` 시트를 제거하고
  `거리별` 시트 하나로 정리함. → **단일 테이블 설계로 확정**.
- 시트 컬럼: `연번, 거리별, 업소명, 영업주, 주소, 주요1인메뉴, 제외메뉴, 휴대폰, 비고` (89행, 헤더는 2번째 행)
- **개인정보 컬럼 발견**: `영업주`(업주 실명), `휴대폰`(개인 번호) — 사용자 확인 결과 **테이블에 저장하지 않기로 결정** (적재 스크립트에서 컬럼 자체를 제외).
- `업소명` 중복 4건 확인 — 동일 상호가 다른 주소(지점)로 등록된 경우라 `주소`로 구분 가능. PK는 자연키 대신 identity 사용(아래 4번).
- `비고` 컬럼은 89행 전부 null (현재는 의미 없는 컬럼이지만 향후 데이터용으로 스키마엔 유지).

## 3. 범위 (Scope)

포함:
- `T_YEOSU_SOLO_RESTAURANT` 테이블 DDL (개인정보 컬럼 제외)
- xlsx → Supabase 적재 스크립트 (`영업주`, `휴대폰` 컬럼은 읽지 않고 버림)
- RLS 공개 SELECT 정책 (개인정보가 빠졌으므로 인기관광지 테이블과 동일하게 공개 조회 허용)

제외:
- `영업주`/`휴대폰` 저장 자체 (필요해지면 별도 비공개 테이블로 추후 논의)
- 강원도 버전 (미다운로드)

## 4. 스키마 설계

### `T_YEOSU_SOLO_RESTAURANT`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `ID` | bigint generated always as identity | PK (프로젝트 표준: PK는 bigint identity) |
| `STORE_UUID` | uuid unique default gen_random_uuid() | 외부 노출용 식별자 |
| `SEQ_NO` | smallint | 원본 xlsx `연번` (참고용, 안정적 키 아님) |
| `REGION` | varchar(20) not null default '여수' | 향후 타 지역 대비 |
| `DISTRICT` | varchar(50) | 거리별(지역/상권 구분) |
| `STORE_NAME` | varchar(200) not null | 업소명 |
| `ADDRESS` | varchar(300) not null | 주소 |
| `MAIN_SOLO_MENU` | varchar(300) | 주요1인메뉴 |
| `EXCLUDED_MENU` | varchar(300) | 제외메뉴 (nullable) |
| `NOTE` | varchar(300) | 비고 (nullable) |
| `CREATED_ON/BY`, `UPDATED_ON/BY` | 공통 감사 컬럼 | 표준 4종, `F_AUDIT_LOG()` 재사용 |

- PK: `ID` (identity)
- `UNQ_T_YEOSU_SOLO_RESTAURANT` unique(`STORE_NAME`, `ADDRESS`) — 동일 상호 다른 지점 구분, 재적재 시 upsert 키로 사용
- 감사 트리거: 기존 `F_AUDIT_LOG()` 재사용 (신규 작성 없음)

## 5. 적재 흐름

```
scripts/data/raw/yeosu_solo_restaurant/여수시 혼밥식당 지정업소(2025+2026).xlsx (거리별 시트)
        ↓ pandas(openpyxl)로 읽기, 헤더 2번째 행
        ↓ 영업주·휴대폰 컬럼 드롭
scripts/load_solo_restaurants.py
   - Supabase Python client, (STORE_NAME, ADDRESS) 기준 upsert
        ↓
T_YEOSU_SOLO_RESTAURANT (89행)
```

- DDL은 Supabase SQL Editor에서 수동 실행 (이전과 동일한 이유로 직접 DB 연결 수단 없음)
- 신규 의존성: `openpyxl` (xlsx 읽기) — `scripts/requirements.txt`에 추가 필요

## 6. 대상 파일 (신규/수정)

- `supabase/ddl/T_YEOSU_SOLO_RESTAURANT.sql` (신규)
- `supabase/ddl/policies/T_YEOSU_SOLO_RESTAURANT_policies.sql` (신규)
- `scripts/load_solo_restaurants.py` (신규)
- `scripts/requirements.txt` — `openpyxl` 추가
- `docs/guides/yeosu-popular-spot-query.md`와 유사한 조회 가이드는 필요 시 후속 추가 (이번 범위에선 생략 — 이미 있는 가이드 패턴을 참고하면 충분히 유추 가능)

## 7. 검증 방법

- `select count(*) from "T_YEOSU_SOLO_RESTAURANT"` → 89행 확인
- 중복 업소명 4건이 서로 다른 행(다른 주소)으로 정상 저장됐는지 확인
- publishable(anon) 키로 조회 시 `영업주`/`휴대폰` 컬럼 자체가 응답에 없는지(=애초에 컬럼이 없으므로 노출 불가) 확인
- 재실행 시 89행 유지(중복 insert 없음) 확인

## 9. 추가: SPOT_ID 연결 (2026-09-09 후속)

`STORE_UUID`(89곳 전부 보유하는 외부 식별자)는 그대로 두고, `T_YEOSU_RELATED_SPOT`(구분=음식)과
업소명이 일치하는 경우에만 데이터랩 해시 ID를 채우는 nullable `SPOT_ID` 컬럼을 추가함.

- 마이그레이션: `supabase/ddl/migrations/2026-09-09_alter_t_yeosu_solo_restaurant_add_spot_id.sql`
- `scripts/load_solo_restaurants.py`가 적재 시 `T_YEOSU_RELATED_SPOT`을 조회해 이름이 일치하는
  업소에만 `SPOT_ID`를 채움 (재실행해도 자동으로 최신 매칭 반영)
- 결과: 87개 상호 중 9곳만 일치 (라도9900, 맛나게장, 싱싱게장마을, 늘푸른식당, 삼학집, 복춘식당,
  서울해장국, 덕충식당, 미가칼국수) — 나머지 80행은 `SPOT_ID`가 NULL로 정상
- FK는 걸지 않음 (연관관광지의 "음식" 항목은 `T_YEOSU_SPOT`에 등록된 27개 관광지 마스터에 속하지 않는
  별도 ID 네임스페이스)

## 10. 추가: SEQ_NO 컬럼 제거 (2026-09-09 후속)

`SEQ_NO`(원본 xlsx 연번)는 값 자체에 의미가 없고 어떤 제약·조회에도 쓰이지 않아 제거함.
`DISTRICT`는 지역 필터링에 쓸 수 있는 실질 데이터라 유지.

- 마이그레이션: `supabase/ddl/migrations/2026-09-09_alter_t_yeosu_solo_restaurant_drop_seq_no.sql`
- `scripts/load_solo_restaurants.py`의 `COLUMN_MAP`/`OUTPUT_COLUMNS`에서 `SEQ_NO` 제거

## 11. 추가: STORE_UUID 제거, SPOT_ID로 외부 식별자 통일 (2026-09-09 후속)

`STORE_UUID`(uuid, 89곳 전부 자동 생성)를 없애고 `SPOT_ID` 하나로 외부 식별자를 통일함.
연관관광지(음식)와 이름이 일치하는 9곳은 그 데이터랩 해시를 그대로 쓰고, 나머지 80곳은 같은
형식(대시 없는 32자리 16진수)의 무작위 값을 채운다 — `md5(random()::text || clock_timestamp()::text)`
는 항상 32자리 소문자 16진수를 반환해 형식이 자연히 일치.

- 마이그레이션: `supabase/ddl/migrations/2026-09-09_alter_t_yeosu_solo_restaurant_replace_store_uuid_with_spot_id.sql`
- `T_YEOSU_SOLO_RESTAURANT.sql`: `SPOT_ID`를 `not null default md5(...)` + `UNQ` 제약으로 변경, `STORE_UUID` 제거
- `scripts/load_solo_restaurants.py`: 재실행해도 무작위 값이 매번 바뀌지 않도록, 기존에 저장된
  `SPOT_ID`를 먼저 조회해 재사용하고 진짜 신규 행에만 새로 생성 (`fetch_existing_spot_id_map`)

## 12. 추가: NOTE 컬럼 제거 (2026-09-09 후속)

`NOTE`(비고)는 원본 xlsx 89행 전부 값이 없어 제거함.

- 마이그레이션: `supabase/ddl/migrations/2026-09-09_alter_t_yeosu_solo_restaurant_drop_note.sql`
- `scripts/load_solo_restaurants.py`의 `COLUMN_MAP`/`OUTPUT_COLUMNS`에서 `NOTE` 제거
