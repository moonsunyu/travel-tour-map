-- 여수시 혼밥(1인) 지정업소 리스트 적재 대상 테이블.
-- 출처: scripts/data/raw/yeosu_solo_restaurant/여수시 혼밥식당 지정업소(2025+2026).xlsx (거리별 시트)
-- 적재: scripts/load_solo_restaurants.py
-- 개인정보(영업주 실명, 휴대폰번호)는 원본에만 있고 이 테이블/스크립트로는 옮기지 않는다.
-- 사전 조건: functions/F_AUDIT_LOG.sql 먼저 실행 (T_YEOSU_POPULAR_SPOT과 공용).
create table if not exists "T_YEOSU_SOLO_RESTAURANT" (
    "ID"              bigint generated always as identity primary key,
    -- 외부 노출용 식별자. T_YEOSU_RELATED_SPOT(구분=음식)과 업소명이 일치하면 그 데이터랩 해시를
    -- 그대로 쓰고, 일치하는 게 없으면 같은 형식(대시 없는 32자리 16진수)의 무작위 값을 채운다.
    "SPOT_ID"         varchar(32)  not null default md5(random()::text || clock_timestamp()::text),
    "REGION"          varchar(20)  not null default '여수',
    "DISTRICT"        varchar(50),
    "STORE_NAME"      varchar(200) not null,
    "ADDRESS"         varchar(300) not null,
    "MAIN_SOLO_MENU"  varchar(300),
    "EXCLUDED_MENU"   varchar(300),
    "CREATED_ON"      timestamptz  not null default current_timestamp,
    "CREATED_BY"      bigint,
    "UPDATED_ON"      timestamptz,
    "UPDATED_BY"      bigint,
    constraint "UNQ_T_YEOSU_SOLO_RESTAURANT" unique ("STORE_NAME", "ADDRESS"),
    constraint "UNQ_T_YEOSU_SOLO_RESTAURANT_SPOT_ID" unique ("SPOT_ID")
);

create trigger "T_YEOSU_SOLO_RESTAURANT_TRG"
    before insert or update on "T_YEOSU_SOLO_RESTAURANT"
    for each row execute function "F_AUDIT_LOG"();
