-- 관광지 마스터 테이블. 지금은 연관관광지 대시보드 데이터가 있는 27곳만 등록한다
-- (T_YEOSU_POPULAR_SPOT 전체 스팟이 아님 — docs/plans/2026-09-09-yeosu-related-spot-supabase.md §3 참고).
-- 적재: scripts/load_related_spots.py
-- 사전 조건: functions/F_AUDIT_LOG.sql 먼저 실행 (다른 여수 테이블과 공용).
create table if not exists "T_YEOSU_SPOT" (
    "SPOT_ID"     varchar(32)  primary key,
    "SPOT_NAME"   varchar(200) not null,
    "CATEGORY"    varchar(50),
    "SIDO"        varchar(20),
    "SIGUNGU"     varchar(20),
    "CREATED_ON"  timestamptz  not null default current_timestamp,
    "CREATED_BY"  bigint,
    "UPDATED_ON"  timestamptz,
    "UPDATED_BY"  bigint
);

create trigger "T_YEOSU_SPOT_TRG"
    before insert or update on "T_YEOSU_SPOT"
    for each row execute function "F_AUDIT_LOG"();
