-- 본인 북마크만 조회/추가/삭제할 수 있게 한다. 사용자가 직접 토글하는 기능이라
-- T_USER_TERMS_AGREEMENT와 달리 INSERT/DELETE도 service_role 제한 없이 본인에게 허용한다.
alter table "T_USER_BOOKMARK" enable row level security;

create policy "T_USER_BOOKMARK_SELECT_OWN"
    on "T_USER_BOOKMARK"
    for select
    to authenticated
    using (auth.uid() = "USER_ID");

create policy "T_USER_BOOKMARK_INSERT_OWN"
    on "T_USER_BOOKMARK"
    for insert
    to authenticated
    with check (auth.uid() = "USER_ID");

create policy "T_USER_BOOKMARK_DELETE_OWN"
    on "T_USER_BOOKMARK"
    for delete
    to authenticated
    using (auth.uid() = "USER_ID");
