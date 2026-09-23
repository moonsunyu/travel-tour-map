-- 약관 목록은 회원가입 화면 등에서 누구나 봐야 하므로 공개 SELECT.
alter table "T_TERMS" enable row level security;

create policy "T_TERMS_SELECT_PUBLIC"
    on "T_TERMS"
    for select
    to anon, authenticated
    using (true);

-- 쓰기는 정책을 두지 않는다 — 약관 추가/개정은 service_role로만(운영자 작업).
