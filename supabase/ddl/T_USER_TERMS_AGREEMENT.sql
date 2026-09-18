-- 사용자별 약관 동의 기록. 약관당 최신 동의 상태 1행 (재동의 시 upsert).
-- 사전 조건: T_TERMS.sql, functions/F_AUDIT_LOG.sql 먼저 실행 (FK 대상).
create table if not exists "T_USER_TERMS_AGREEMENT" (
    "ID"               bigint generated always as identity primary key,
    "USER_ID"          uuid         not null references auth.users ("id") on delete cascade,
    "TERM_CODE"        varchar(30)  not null references "T_TERMS" ("TERM_CODE"),
    "AGREED"           boolean      not null,
    "AGREED_VERSION"   varchar(20)  not null,
    "CREATED_ON"       timestamptz  not null default current_timestamp,
    "CREATED_BY"       bigint,
    "UPDATED_ON"       timestamptz,
    "UPDATED_BY"       bigint,
    constraint "UNQ_T_USER_TERMS_AGREEMENT" unique ("USER_ID", "TERM_CODE")
);

-- db-development-postgres 표준: FK 컬럼은 수동 인덱스 필요.
create index "IDX_T_USER_TERMS_AGREEMENT_USER" on "T_USER_TERMS_AGREEMENT" ("USER_ID");

create trigger "T_USER_TERMS_AGREEMENT_TRG"
    before insert or update on "T_USER_TERMS_AGREEMENT"
    for each row execute function "F_AUDIT_LOG"();
