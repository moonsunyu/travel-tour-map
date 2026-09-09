-- 인기관광지(T_YEOSU_SPOT) 선택 시 딸려나오는 연관관광지 목록.
-- 출처: scripts/data/raw/yeosu_related_spot_202507-202606/*.csv (27개 파일 x 50행)
-- 적재: scripts/load_related_spots.py
-- 사전 조건: T_YEOSU_SPOT.sql, functions/F_AUDIT_LOG.sql 먼저 실행 (FK 대상).
create table if not exists "T_YEOSU_RELATED_SPOT" (
    "ID"                 bigint generated always as identity primary key,
    "CENTER_SPOT_ID"     varchar(32)  not null references "T_YEOSU_SPOT" ("SPOT_ID"),
    "RANK"               smallint     not null,
    "RELATED_SPOT_ID"    varchar(32)  not null,
    "RELATED_SPOT_NAME"  varchar(200) not null,
    "RELATED_SIDO"       varchar(20),
    "RELATED_SIGUNGU"    varchar(20),
    "RELATED_CATEGORY"   varchar(50),
    "CREATED_ON"         timestamptz  not null default current_timestamp,
    "CREATED_BY"         bigint,
    "UPDATED_ON"         timestamptz,
    "UPDATED_BY"         bigint,
    constraint "UNQ_T_YEOSU_RELATED_SPOT" unique ("CENTER_SPOT_ID", "RELATED_SPOT_ID")
);

-- db-development-postgres 표준: FK 컬럼은 수동 인덱스 필요 (자동 생성 안 됨).
create index "IDX_T_YEOSU_RELATED_SPOT_CENTER" on "T_YEOSU_RELATED_SPOT" ("CENTER_SPOT_ID");

create trigger "T_YEOSU_RELATED_SPOT_TRG"
    before insert or update on "T_YEOSU_RELATED_SPOT"
    for each row execute function "F_AUDIT_LOG"();
