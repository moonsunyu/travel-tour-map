# 여수 인기관광지 조회 가이드 (프론트엔드용)

`T_YEOSU_POPULAR_SPOT` 테이블을 Next.js에서 `supabase-js`로 직접 조회하는 방법.
관련 계획서: [`2026-09-08-tourdata-supabase-storage.md`](../plans/2026-09-08-tourdata-supabase-storage.md)

## 사전 준비

1. `supabase/ddl/policies/T_YEOSU_POPULAR_SPOT_policies.sql`을 Supabase SQL Editor에서 실행 (RLS 활성화 + 공개 읽기 정책).
2. 프론트엔드 프로젝트의 `.env.local`에 아래 두 값만 넣는다 (둘 다 브라우저 노출 가능한 값, `.gitignore`의 `frontend/.env.local`로 보호됨):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://hkndfhdihzchiqxnidat.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<Settings → API → Publishable key>
   ```
   `SUPABASE_SERVICE_ROLE_KEY`(secret)는 절대 프론트엔드 코드/환경변수에 넣지 않는다 — RLS를 완전히 우회하는 키다.

## 전체 목록 조회

```ts
const { data, error } = await supabase
  .from('T_YEOSU_POPULAR_SPOT')
  .select('SPOT_NAME, CATEGORY, RANK, RATIO, AGE_GROUP')
  .eq('AGE_GROUP', '전체')
  .order('RANK', { ascending: true })
```

## 연령대별 필터 조회

`AGE_GROUP` 값은 `20`/`30`/`40`/`50`/`60`/`전체` 중 하나 (예: "20대" 선택 시 `'20'`).

```ts
function getPopularSpotsByAge(ageGroup: '20' | '30' | '40' | '50' | '60' | '전체') {
  return supabase
    .from('T_YEOSU_POPULAR_SPOT')
    .select('SPOT_NAME, CATEGORY, RANK, RATIO')
    .eq('REGION', '여수')
    .eq('AGE_GROUP', ageGroup)
    .order('RANK', { ascending: true })
}
```

## 참고

- 테이블/컬럼명이 대문자라 쿼리 문자열에서도 대소문자를 정확히 맞춰야 한다 (`db-development-postgres` 표준 — 식별자가 quoted-uppercase로 생성됨).
- `PERIOD_LABEL` 조건을 안 걸면 현재는 `202507~202606` 한 기간만 있어 문제 없지만, 다음 기간 데이터가 추가되면 최신 `PERIOD_LABEL`을 지정하거나 `order + limit`으로 최신 기간만 가져오는 조건이 필요해진다 (이번 범위 밖 — 데이터 축적 시 별도 처리).
