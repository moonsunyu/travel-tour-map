-- 한국관광데이터랩 "세대별 인기관광지" CSV 적재 대상 테이블 (여수시).
-- 출처: scripts/data/raw/yeosu_popular_spot_202507-202606/*.csv
-- 적재: scripts/load_popular_spots.py
-- 사전 조건: functions/F_AUDIT_LOG.sql 먼저 실행.
create table if not exists "T_YEOSU_POPULAR_SPOT" (
    "REGION"        varchar(20)  not null default '여수',
    "PERIOD_LABEL"  varchar(20)  not null,
    "AGE_GROUP"     varchar(10)  not null,
    "SPOT_ID"       varchar(32)  not null,
    "RANK"          smallint     not null,
    "SPOT_NAME"     varchar(200) not null,
    "CATEGORY"      varchar(50),
    "RATIO"         numeric(5,2),
    "CREATED_ON"    timestamptz  not null default current_timestamp,
    "CREATED_BY"    bigint,
    "UPDATED_ON"    timestamptz,
    "UPDATED_BY"    bigint,
    constraint "PK_T_YEOSU_POPULAR_SPOT" primary key ("REGION", "PERIOD_LABEL", "AGE_GROUP", "SPOT_ID")
);

create trigger "T_YEOSU_POPULAR_SPOT_TRG"
    before insert or update on "T_YEOSU_POPULAR_SPOT"
    for each row execute function "F_AUDIT_LOG"();
