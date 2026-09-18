-- 초기 약관 3종. 본문은 없음(법무 검토 영역, 범위 밖) — 코드/필수여부/버전만.
insert into "T_TERMS" ("TERM_CODE", "TITLE", "IS_REQUIRED", "VERSION")
values
    ('TOS', '이용약관', true, 'v1'),
    ('PRIVACY', '개인정보 처리방침', true, 'v1'),
    ('LBS', '위치기반서비스 이용약관', false, 'v1')
on conflict ("TERM_CODE") do nothing;
