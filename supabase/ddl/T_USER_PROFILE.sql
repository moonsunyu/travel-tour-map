-- 회원 프로필(닉네임/프로필이미지). Supabase Auth의 auth.users엔 이메일/비밀번호만 있어
-- 별도 테이블로 확장한다. auth.users 1행당 정확히 1행 (USER_ID가 PK이자 FK).
-- 사전 조건: functions/F_AUDIT_LOG.sql 먼저 실행.
create table if not exists "T_USER_PROFILE" (
    "USER_ID"            uuid         primary key references auth.users ("id") on delete cascade,
    "NICKNAME"           varchar(30)  not null,
    "PROFILE_IMAGE_URL"  varchar(500),
    "CREATED_ON"         timestamptz  not null default current_timestamp,
    "CREATED_BY"         bigint,
    "UPDATED_ON"         timestamptz,
    "UPDATED_BY"         bigint,
    constraint "UNQ_T_USER_PROFILE_NICKNAME" unique ("NICKNAME")
);

create trigger "T_USER_PROFILE_TRG"
    before insert or update on "T_USER_PROFILE"
    for each row execute function "F_AUDIT_LOG"();
