-- 공통 감사 컬럼(CREATED_ON/UPDATED_ON) 자동 스탬프 트리거 함수.
-- 컬럼 존재 여부를 확인하므로 4컬럼이 없는 테이블에 실수로 붙여도 안전하다.
-- .claude/skills/db-development-postgres 표준: 원본은 이 파일이 SSOT이며, 다른 테이블도 이 함수를 재사용한다.
create or replace function "F_AUDIT_LOG"()
returns trigger
language plpgsql
as $$
begin
    if TG_OP = 'INSERT' then
        if to_jsonb(NEW) ? 'CREATED_ON' then
            NEW."CREATED_ON" := current_timestamp;
        end if;
    elsif TG_OP = 'UPDATE' then
        if to_jsonb(NEW) ? 'UPDATED_ON' then
            NEW."UPDATED_ON" := current_timestamp;
        end if;
    end if;
    return NEW;
end;
$$;
