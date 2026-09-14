-- 약관 마스터. 본문 텍스트는 담지 않고(법무 검토 영역, 범위 밖) 동의 대상 항목과
-- 필수/선택 여부, 버전만 관리한다. 초기 데이터는 supabase/seed/T_TERMS_seed.sql.
-- 사전 조건: functions/F_AUDIT_LOG.sql 먼저 실행.
create table if not exists "T_TERMS" (
    "TERM_CODE"    varchar(30)  primary key,
    "TITLE"        varchar(100) not null,
    "IS_REQUIRED"  boolean      not null,
    "VERSION"      varchar(20)  not null,
    "CREATED_ON"   timestamptz  not null default current_timestamp,
    "CREATED_BY"   bigint,
    "UPDATED_ON"   timestamptz,
    "UPDATED_BY"   bigint
);

create trigger "T_TERMS_TRG"
    before insert or update on "T_TERMS"
    for each row execute function "F_AUDIT_LOG"();
