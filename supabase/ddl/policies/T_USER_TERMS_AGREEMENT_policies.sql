-- 본인 동의 기록만 읽을 수 있게 한다.
alter table "T_USER_TERMS_AGREEMENT" enable row level security;

create policy "T_USER_TERMS_AGREEMENT_SELECT_OWN"
    on "T_USER_TERMS_AGREEMENT"
    for select
    to authenticated
    using (auth.uid() = "USER_ID");

-- INSERT/UPDATE는 정책을 두지 않는다 — service_role(서버 API)로만 기록(회원가입/약관 재동의 로직).
