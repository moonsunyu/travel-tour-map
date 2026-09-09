-- T_YEOSU_SOLO_RESTAURANT을 프론트(Next.js, publishable/anon key)가 직접 조회할 수 있도록
-- RLS를 켜고 공개 읽기 정책을 추가한다. 개인정보(영업주/휴대폰)는 이 테이블에 애초에 저장하지
-- 않으므로 T_YEOSU_POPULAR_SPOT과 동일하게 조건 없이 공개 SELECT를 허용한다.
alter table "T_YEOSU_SOLO_RESTAURANT" enable row level security;

create policy "T_YEOSU_SOLO_RESTAURANT_SELECT_PUBLIC"
    on "T_YEOSU_SOLO_RESTAURANT"
    for select
    to anon, authenticated
    using (true);
