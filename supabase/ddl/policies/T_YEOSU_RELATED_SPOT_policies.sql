-- T_YEOSU_RELATED_SPOT 공개 조회 허용 (개인정보 없는 연관관광지 매핑 데이터).
alter table "T_YEOSU_RELATED_SPOT" enable row level security;

create policy "T_YEOSU_RELATED_SPOT_SELECT_PUBLIC"
    on "T_YEOSU_RELATED_SPOT"
    for select
    to anon, authenticated
    using (true);
