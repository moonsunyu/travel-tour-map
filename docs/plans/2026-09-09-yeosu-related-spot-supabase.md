# 계획서: 여수시 연관관광지 CSV → Supabase(PostgreSQL) 저장 + 인기관광지 연결

- 작성일: 2026-09-09
- 관련 데이터: `scripts/data/raw/yeosu_related_spot_202507-202606/*.csv` (27개 파일)
- 선행 테이블: `T_YEOSU_POPULAR_SPOT` ([`2026-09-08-tourdata-supabase-storage.md`](2026-09-08-tourdata-supabase-storage.md))

## 1. 무엇을 (What)

한국관광데이터랩 "연관관광지 대시보드" CSV(중심관광지 27곳 × 연관관광지 50개)를 Supabase에 저장하고,
인기관광지 선택 시(`오동도` 등) 그 연관관광지 목록을 조회할 수 있도록 연결한다.

## 2. 데이터 확인 결과

- 파일당 1개 중심관광지 기준 연관관광지 50개, 27개 파일 = 총 1350행
- 컬럼: `순위, 중심관광지ID, 중심관광지명, 중심시도명, 중심시군구명, 중심카테고리 명_중, 연관관광지ID, 연관관광지명, 연관관광지시도명, 연관관광지시군구명, 구분`
- **`중심관광지ID` = `T_YEOSU_POPULAR_SPOT.SPOT_ID`와 동일한 데이터랩 해시 ID.** 27개 전부 이미 해당 테이블에 존재 확인함 → 이름 대신 ID로 연결하는 것이 안전 (동명이인/표기 차이 위험 없음).
- 파일 내 연관관광지 중복·자기참조 없음.
- `구분`(연관관광지 카테고리) 9종: 기타관광/레저스포츠/문화관광/쇼핑/숙박/역사관광/음식/자연관광/체험관광.

## 3. 설계상 이슈와 해결

요청하신 "관심지점명을 PK, 중심관광지명을 FK로"를 그대로 구현하려면, FK가 참조하는 컬럼은
유니크해야 하는데 `T_YEOSU_POPULAR_SPOT`의 `SPOT_ID`는 연령대별(20/30/40/50/60/전체)로 6번
반복되어 단독으로 유니크하지 않다 (PK가 `REGION+PERIOD_LABEL+AGE_GROUP+SPOT_ID` 복합키).

**해결**: 관광지 정체성(이름/카테고리)만 담는 마스터 테이블 `T_YEOSU_SPOT`을 새로 두고, 여기의
`SPOT_ID`를 PK로 삼는다. `T_YEOSU_POPULAR_SPOT`은 그대로 두고(연령대별 순위 데이터라 성격이 다름),
`T_YEOSU_RELATED_SPOT.CENTER_SPOT_ID`가 `T_YEOSU_SPOT.SPOT_ID`를 FK로 참조한다.

> 범위 제한: `T_YEOSU_SPOT`은 지금은 **연관관광지 데이터가 있는 27곳만** 등록한다 (인기관광지 목록엔
> 있지만 연관관광지 파일이 없는 나머지 스팟은 제외). 인기관광지 쪽에서 상세 링크를 항상 보장하려면
> 추후 `T_YEOSU_POPULAR_SPOT` 전체 스팟까지 `T_YEOSU_SPOT`을 넓히는 후속 작업이 필요 — 이번 범위 밖.

## 4. 스키마 설계

### `T_YEOSU_SPOT` (관광지 마스터 — 연관관광지 있는 27곳)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `SPOT_ID` | varchar(32) primary key | 데이터랩 해시 ID (중심관광지ID) |
| `SPOT_NAME` | varchar(200) not null | 중심관광지명 |
| `CATEGORY` | varchar(50) | 중심카테고리 명_중 (예: 자연관광) |
| `SIDO` | varchar(20) | 중심시도명 |
| `SIGUNGU` | varchar(20) | 중심시군구명 |
| `CREATED_ON/BY`, `UPDATED_ON/BY` | 공통 감사 컬럼 | `F_AUDIT_LOG()` 재사용 |

### `T_YEOSU_RELATED_SPOT` (연관관광지 매핑)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `ID` | bigint generated always as identity primary key | |
| `CENTER_SPOT_ID` | varchar(32) not null references `T_YEOSU_SPOT`(`SPOT_ID`) | 어떤 인기관광지의 연관 목록인지 |
| `RANK` | smallint | 순위 (1~50) |
| `RELATED_SPOT_ID` | varchar(32) not null | 연관관광지ID |
| `RELATED_SPOT_NAME` | varchar(200) not null | 연관관광지명 |
| `RELATED_SIDO` | varchar(20) | 연관관광지시도명 |
| `RELATED_SIGUNGU` | varchar(20) | 연관관광지시군구명 |
| `RELATED_CATEGORY` | varchar(50) | 구분 (음식/숙박/자연관광 등 9종) |
| `CREATED_ON/BY`, `UPDATED_ON/BY` | 공통 감사 컬럼 | `F_AUDIT_LOG()` 재사용 |

- `constraint UNQ_T_YEOSU_RELATED_SPOT unique (CENTER_SPOT_ID, RELATED_SPOT_ID)` — 재적재 시 upsert 키
- `create index IDX_T_YEOSU_RELATED_SPOT_CENTER on T_YEOSU_RELATED_SPOT (CENTER_SPOT_ID)` — FK 컬럼 수동 인덱스 (db-development-postgres 표준)

## 5. 적재 흐름

```
scripts/data/raw/yeosu_related_spot_202507-202606/*.csv (27개)
        ↓ pandas
scripts/load_related_spots.py
   1) 파일별 첫 행에서 중심관광지 정보 추출 → T_YEOSU_SPOT upsert (27행)
   2) 파일의 전체 행 → T_YEOSU_RELATED_SPOT upsert (1350행)
```

- DDL은 Supabase SQL Editor에서 수동 실행 (기존과 동일)
- 실행 순서: `T_YEOSU_SPOT.sql` → `T_YEOSU_RELATED_SPOT.sql` (FK 때문에 순서 중요) → 각 `policies/*.sql`

## 6. 프론트 조회 시나리오 (참고)

"오동도" 선택 → 연관관광지 목록:
```ts
supabase
  .from('T_YEOSU_RELATED_SPOT')
  .select('RELATED_SPOT_NAME, RELATED_CATEGORY, RANK')
  .eq('CENTER_SPOT_ID', spotId)   // T_YEOSU_POPULAR_SPOT에서 선택된 행의 SPOT_ID
  .order('RANK', { ascending: true })
```

## 7. 대상 파일 (신규)

- `supabase/ddl/T_YEOSU_SPOT.sql`
- `supabase/ddl/T_YEOSU_RELATED_SPOT.sql`
- `supabase/ddl/policies/T_YEOSU_SPOT_policies.sql`
- `supabase/ddl/policies/T_YEOSU_RELATED_SPOT_policies.sql`
- `scripts/load_related_spots.py`

## 8. 검증 방법

- `select count(*) from "T_YEOSU_SPOT"` → 27
- `select count(*) from "T_YEOSU_RELATED_SPOT"` → 1350
- `오동도`의 `SPOT_ID`로 `T_YEOSU_RELATED_SPOT` 조회 → 50행, `RANK` 1번이 `향일암`인지 원본 CSV와 대조
- anon 키로 두 테이블 모두 조회되는지 확인
- 존재하지 않는 `CENTER_SPOT_ID`로 insert 시도 시 FK 위반으로 거부되는지 간단 확인 (선택)
