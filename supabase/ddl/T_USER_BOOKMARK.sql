-- 사용자별 장소 북마크. SPOT_ID가 여수/강원 여러 테이블에 분산돼 있고 이를 하나로 묶는
-- 마스터 테이블이 없어 FK는 걸지 않는다. 대신 REGION/CATEGORY/SPOT_NAME을 북마크 당시
-- 스냅샷으로 같이 저장해, 원본 테이블 join 없이도 북마크 목록을 바로 그릴 수 있게 한다.
-- 사전 조건: functions/F_AUDIT_LOG.sql 먼저 실행.
create table if not exists "T_USER_BOOKMARK" (
    "ID"          bigint generated always as identity primary key,
    "USER_ID"     uuid         not null references auth.users ("id") on delete cascade,
    "SPOT_ID"     varchar(32)  not null,
    "REGION"      varchar(20)  not null,
    "CATEGORY"    varchar(50),
    "SPOT_NAME"   varchar(200) not null,
    "CREATED_ON"  timestamptz  not null default current_timestamp,
    "CREATED_BY"  bigint,
    "UPDATED_ON"  timestamptz,
    "UPDATED_BY"  bigint,
    constraint "UNQ_T_USER_BOOKMARK" unique ("USER_ID", "SPOT_ID")
);

-- db-development-postgres 표준: FK 컬럼은 수동 인덱스 필요 (자동 생성 안 됨).
create index "IDX_T_USER_BOOKMARK_USER" on "T_USER_BOOKMARK" ("USER_ID");

create trigger "T_USER_BOOKMARK_TRG"
    before insert or update on "T_USER_BOOKMARK"
    for each row execute function "F_AUDIT_LOG"();
