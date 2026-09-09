-- T_YEOSU_SPOT 공개 조회 허용 (개인정보 없는 관광지 마스터 데이터).
alter table "T_YEOSU_SPOT" enable row level security;

create policy "T_YEOSU_SPOT_SELECT_PUBLIC"
    on "T_YEOSU_SPOT"
    for select
    to anon, authenticated
    using (true);
