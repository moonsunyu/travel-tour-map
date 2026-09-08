# 계획서: 여수시 세대별 인기관광지 CSV → Supabase(PostgreSQL) 저장

- 작성일: 2026-09-08
- 관련 데이터: `인기관광지_202507~202606/` (한국관광데이터랩에서 직접 다운로드한 CSV 6개)
- 근거: `.claude/skills/db-development-postgres` (네이밍·감사컬럼·트리거 표준), README.md `데이터 병합 규칙` 섹션

> 이전 버전 계획서는 `scripts/tourapi.py`(관광공사 API)를 대상으로 잘못 작성되었던 것을 수정함.
> 이번 데이터는 **API 호출이 아니라 데이터랩에서 수동 다운로드한 정적 CSV**.

## 1. 무엇을 (What)

한국관광데이터랩에서 다운로드한 "여수시 세대별 인기관광지" CSV 6종(20대/30대/40대/50대/60대이상/전체,
기간 2025-07~2026-06)을 Supabase PostgreSQL 테이블로 적재한다.

## 2. 왜 (Why)

기획 스택의 "'20대' 선택 시 해당 장소들이 나오도록" 요구사항을 만족하려면, 연령대별 인기관광지
데이터가 DB에 있어야 프론트엔드에서 연령대로 필터링한 쿼리를 만들 수 있다.

## 3. 현재 데이터 확인 결과

파일 위치: `인기관광지_202507~202606/20260908180530_세대별 인기관광지(<연령대>).csv` (총 6개)

CSV 컬럼 (헤더 그대로, UTF-8 BOM):
```
순위,관광지ID,관심지점명,구분,연령대,비율
1,e66964b9e7e6f339c9633f5e676f2e89,아쿠아플라넷여수,관광명소,20,13.8
```
- 파일당 30행(순위 1~30) + 헤더. `연령대` 컬럼 값은 파일별로 `20`/`30`/`40`/`50`/`60대이상`/`전체` 중 하나로 고정.
- `관광지ID`는 데이터랩 자체 해시값 — `scripts/tourapi.py`가 쓰는 관광공사 `contentid`와 **별개의 ID 체계**. 두 데이터를 나중에 연결하려면 장소명 기준 매칭이 필요함 (이번 계획 범위 밖).
- 지역·기간 정보는 CSV 내용에는 없고 **폴더명(`인기관광지_202507~202606`)에만** 존재 → 적재 시 별도 컬럼으로 주입 필요.

## 4. 범위 (Scope)

포함:
- `T_YEOSU_POPULAR_SPOT` 테이블 DDL 1개 + 감사 트리거(`F_AUDIT_LOG`)
- CSV → Supabase 적재 스크립트 1개 (6개 파일 전체 처리)
- 원본 CSV 폴더를 `scripts/data/raw/`(이미 `.gitignore`에 등록된 경로) 하위로 이동

제외 (다음 단계로 미룸):
- 연관 관광지, 관광지 리스트(GW API) 데이터 — 아직 파일 없음
- 관광공사 API(`tourapi.py`) 데이터와의 매칭/병합
- 강원도 버전 (아직 미다운로드, 받으면 별도 계획서 또는 이 계획서 확장)

## 5. 스키마 설계

### `T_YEOSU_POPULAR_SPOT`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `SPOT_ID` | varchar(32) | 데이터랩 해시 ID (원본 `관광지ID`) |
| `RANK` | smallint | 순위 (1~30) |
| `SPOT_NAME` | varchar(200) | 관심지점명 |
| `CATEGORY` | varchar(50) | 구분 (예: 관광명소, 레저/스포츠, 종교 등) |
| `AGE_GROUP` | varchar(10) | 연령대: `20`/`30`/`40`/`50`/`60`/`전체` (실제 CSV `연령대` 컬럼 값 그대로 — "60대이상" 파일도 값은 `60`으로 저장돼 있어 별도 정규화 불필요, 확인 완료) |
| `RATIO` | numeric(5,2) | 비율(%) |
| `REGION` | varchar(20) | 지역 — 지금은 항상 `여수` (강원도 대비 컬럼만 미리 확보) |
| `PERIOD_LABEL` | varchar(20) | 집계 기간, 폴더명 그대로 `202507~202606` |
| `CREATED_ON/BY`, `UPDATED_ON/BY` | 공통 감사 컬럼 | 표준 4종 |

- PK: `(REGION, PERIOD_LABEL, AGE_GROUP, SPOT_ID)` — 같은 장소가 연령대별 파일에 반복 등장하므로 복합키로 구분.
- 감사 트리거 `T_YEOSU_POPULAR_SPOT_TRG`: `F_AUDIT_LOG()` 함수는 이번에 신규 작성 (스킬 폴더에 원본 파일이 없음 — `docs/DB_ARCHITECTURE_GUIDE.md` 설명 기반으로 새로 작성 후 재사용).

## 6. 적재 흐름

```
인기관광지_202507~202606/*.csv (6개)
        ↓  pandas로 읽기 (UTF-8 BOM 처리)
scripts/load_popular_spots.py
   - 폴더명에서 PERIOD_LABEL 파싱, REGION='여수' 고정
   - Supabase Python client (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)로 upsert
        ↓
T_YEOSU_POPULAR_SPOT (180행 = 6파일 × 30행)
```

- DDL은 Supabase SQL Editor에서 최초 1회 수동 실행
- 적재 스크립트는 `python scripts/load_popular_spots.py` 로 수동 실행 (재실행 시 PK 충돌 없이 upsert)

## 7. 대상 파일 (신규/수정/이동)

- `supabase/ddl/T_YEOSU_POPULAR_SPOT.sql` (신규)
- `supabase/ddl/functions/F_AUDIT_LOG.sql` (신규)
- `scripts/load_popular_spots.py` (신규)
- `인기관광지_202507~202606/` → `scripts/data/raw/yeosu_popular_spot_202507-202606/` (이동 — 현재 위치는 `.gitignore` 보호 밖이라 실수로 커밋될 위험 있음)
- `scripts/requirements.txt` — 변경 불필요 (`supabase`, `pandas` 이미 포함)

## 8. 검증 방법

- Supabase SQL Editor에서 `select count(*) from "T_YEOSU_POPULAR_SPOT"` → 180행 확인
- `AGE_GROUP='20'`으로 필터링해 30행, 비율 내림차순 정렬이 원본 CSV 순위와 일치하는지 확인
- 스크립트 재실행 후 행 수가 그대로 180인지 확인 (중복 insert 없음 = upsert 정상 동작)

## 9. 확인 필요 사항 (해결됨)

1. ~~`scripts/data/raw/`로 이동하는 것에 동의하는지~~ → 승인됨, 이동 완료
2. ~~`60대이상`을 컬럼 값으로 정규화할지~~ → 실제 확인 결과 원본 CSV `연령대` 컬럼 값이 이미 `60`(숫자)이라 정규화 자체가 불필요함
