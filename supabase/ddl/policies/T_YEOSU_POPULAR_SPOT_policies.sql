-- T_YEOSU_POPULAR_SPOT을 프론트(Next.js, publishable/anon key)가 직접 조회할 수 있도록
-- RLS를 켜고 공개 읽기 정책을 추가한다. 관광지 순위/비율은 비공개 정보가 아니므로
-- 조건 없이 SELECT만 허용하고, INSERT/UPDATE/DELETE는 service_role(적재 스크립트)만 가능하게
-- 별도 정책을 만들지 않는다 (RLS 활성화 시 정책이 없는 작업은 기본 거부됨).
alter table "T_YEOSU_POPULAR_SPOT" enable row level security;

create policy "T_YEOSU_POPULAR_SPOT_SELECT_PUBLIC"
    on "T_YEOSU_POPULAR_SPOT"
    for select
    to anon, authenticated
    using (true);
