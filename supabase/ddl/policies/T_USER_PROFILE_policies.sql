-- 개인정보라 본인 행만 읽고/고칠 수 있게 한다 (관광지 데이터의 "전체 공개"와 다름).
alter table "T_USER_PROFILE" enable row level security;

create policy "T_USER_PROFILE_SELECT_OWN"
    on "T_USER_PROFILE"
    for select
    to authenticated
    using (auth.uid() = "USER_ID");

create policy "T_USER_PROFILE_UPDATE_OWN"
    on "T_USER_PROFILE"
    for update
    to authenticated
    using (auth.uid() = "USER_ID")
    with check (auth.uid() = "USER_ID");

-- INSERT/DELETE는 정책을 두지 않는다 — service_role(서버 API)로만 생성/삭제(회원가입/탈퇴 로직).
