# 계획서: 회원가입 확장(닉네임·프로필이미지·약관동의) + 마이페이지 + 비밀번호 찾기 API

- 작성일: 2026-09-14
- 선행 계획서: [`2026-09-14-auth-login-signup-api.md`](2026-09-14-auth-login-signup-api.md)(이메일/비밀번호 API), [`2026-09-14-social-login-google-kakao.md`](2026-09-14-social-login-google-kakao.md)(구글 소셜 로그인)

## 1. 무엇을 (What)

사용자가 제시한 스펙대로 아래 5개 기능군의 API를 구현한다 (UI 없이 API만, 기존과 동일한 방식).

1. 회원가입 확장 — 닉네임(중복불가)·프로필이미지·비밀번호 규칙·약관동의
2. 로그인 — 기존 이메일/구글 유지, "로그인 유지"(세션 자동 갱신) 보강
3. 비밀번호 찾기/재설정
4. 마이페이지 — 닉네임/프로필사진 변경, 비밀번호 변경, 회원탈퇴
5. 약관동의 기록(회원가입·소셜 로그인 최초 시)

## 2. 왜 스키마 변경이 필요한가

Supabase Auth의 `auth.users` 테이블엔 이메일/비밀번호만 있고 **닉네임·프로필이미지·약관동의**를
저장할 곳이 없다. `public` 스키마에 우리 테이블을 추가하고 `auth.users.id`(uuid)를 FK로 연결한다.

## 3. 스키마 설계

### `T_USER_PROFILE` (1인당 1행)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `USER_ID` | uuid primary key references `auth.users`(`id`) on delete cascade | Supabase Auth 사용자와 1:1 |
| `NICKNAME` | varchar(30) not null unique | 중복 불가 |
| `PROFILE_IMAGE_URL` | varchar(500) | null이면 프론트에서 기본 이미지로 대체(아래 6번 질문) |
| `CREATED_ON/BY`, `UPDATED_ON/BY` | 공통 감사 컬럼 | `F_AUDIT_LOG()` 재사용 |

- 회원 탈퇴 시 `auth.users`에서 삭제되면 `on delete cascade`로 이 행도 자동 삭제됨.
- 닉네임 규칙(가정, 8번 질문 참고): 2~20자, 한글/영문/숫자만 허용, 공백·특수문자 금지.

### `T_TERMS` (약관 마스터)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `TERM_CODE` | varchar(30) primary key | `TOS`(이용약관) / `PRIVACY`(개인정보처리방침) / `LBS`(위치기반서비스) |
| `TITLE` | varchar(100) not null | 화면 표시용 제목 |
| `IS_REQUIRED` | boolean not null | 필수/선택 |
| `VERSION` | varchar(20) not null | 약관 버전(나중에 개정 시 값 변경) |
| `CREATED_ON/BY`, `UPDATED_ON/BY` | 공통 감사 컬럼 | |

- 초기 시드: `TOS`(필수), `PRIVACY`(필수), `LBS`(선택) — 실제 약관 **본문은 이번 범위 밖**(법무 검토
  필요한 콘텐츠라 API/DB엔 동의 여부·버전만 기록).

### `T_USER_TERMS_AGREEMENT`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `ID` | bigint generated always as identity primary key | |
| `USER_ID` | uuid not null references `auth.users`(`id`) on delete cascade | |
| `TERM_CODE` | varchar(30) not null references `T_TERMS`(`TERM_CODE`) | |
| `AGREED` | boolean not null | |
| `AGREED_VERSION` | varchar(20) not null | 동의 시점의 `T_TERMS.VERSION` 스냅샷 |
| `CREATED_ON/BY`, `UPDATED_ON/BY` | 공통 감사 컬럼 | `CREATED_ON`이 곧 동의 시각 |

- `unique(USER_ID, TERM_CODE)` — 사용자당 약관별 최신 동의 상태 1행 (재동의 시 upsert).

### RLS 정책 (기존 관광 데이터 테이블과 다름 — 본인 데이터만 공개)

| 테이블 | 정책 |
|---|---|
| `T_USER_PROFILE` | 본인 행만 SELECT/UPDATE 가능 (`auth.uid() = USER_ID`) |
| `T_USER_TERMS_AGREEMENT` | 본인 행만 SELECT/INSERT 가능 |
| `T_TERMS` | 전체 공개 SELECT (약관 목록은 누구나 봐야 화면에 표시 가능) |

> 관광지 데이터(T_YEOSU_*)는 "누구나 조회 가능"이 맞았지만, 이건 개인정보라 본인 것만 보이게
> 하는 게 기본값 — 다른 사용자 닉네임을 공개해야 하는 기능(리뷰 등)이 생기면 그때 별도 정책 추가.

## 4. Storage — 프로필 이미지

- 버킷 `profile-images` 신규 생성, **public 버킷**으로 설정 (아바타는 민감정보 아님 — 일반적 관행).
  이 작업은 service_role 키로 스크립트에서 직접 생성 가능(대시보드 수작업 불필요).
- 업로드 경로: `profile-images/{USER_ID}/{timestamp}.{ext}` — 사용자별 폴더로 분리.
- 업로드 정책: 5MB 이하, `image/jpeg|png|webp`만 허용 (API 레벨에서 체크).

## 5. API 목록

### 5.1 회원가입 (기존 `/api/auth/signup` 확장)

`POST /api/auth/signup`
```json
{
  "email": "...", "password": "...", "nickname": "...",
  "profileImageUrl": null,
  "terms": [{ "code": "TOS", "agreed": true }, { "code": "PRIVACY", "agreed": true }, { "code": "LBS", "agreed": false }]
}
```
- 검증 순서: 비밀번호 규칙(영문+숫자+특수문자 조합 8자↑) → 필수 약관 전부 동의했는지 → 닉네임 형식 →
  **닉네임 중복 사전 확인**(레이스 컨디션 완화 목적, 완전한 원자성 보장은 아님) → Supabase `signUp`
  → `T_USER_PROFILE` 생성 → `T_USER_TERMS_AGREEMENT` 기록.
- **롤백 안전장치**: 프로필 생성(닉네임 unique 위반 등)이 실패하면, 방금 만든 Auth 사용자를
  `admin.deleteUser`로 되돌려 고아 계정이 안 남게 한다.

`GET /api/profile/nickname-check?nickname=xxx` — 사전 중복확인용 (프론트에서 실시간 체크에 사용 가능)

### 5.2 로그인 — "로그인 유지"

- 기존 `/api/auth/login`, `/api/auth/google` 그대로 유지.
- **신규**: `frontend/middleware.ts` 추가 — 매 요청마다 만료된 Access Token을 Refresh Token으로
  자동 갱신(Supabase 공식 패턴). 이게 없으면 Access Token 만료 후 "로그인 유지"가 끊김.

### 5.3 비밀번호 찾기/재설정

- `POST /api/auth/password/reset-request { email }` — 재설정 링크 이메일 발송(`resetPasswordForEmail`).
- `POST /api/auth/password/reset-confirm { password }` — 이메일 링크 클릭 후 발급된 **recovery 세션**
  상태에서 새 비밀번호로 변경 (`updateUser`). 현재 비밀번호 불필요(이메일 소유로 본인확인 대체).

### 5.4 마이페이지

- `GET /api/profile` — 내 프로필 조회(닉네임/이미지/이메일)
- `PATCH /api/profile { nickname }` — 닉네임 변경(중복 검사)
- `POST /api/profile/image` (multipart) — 프로필 이미지 업로드 → Storage 저장 → URL 갱신
- `PUT /api/profile/password { currentPassword, newPassword }` — 마이페이지 비밀번호 변경
  (재설정과 달리 **현재 비밀번호 재확인** 필수 — `signInWithPassword`로 검증 후 `updateUser`)
- `DELETE /api/account` — 회원탈퇴: Storage 이미지 삭제 → `T_USER_PROFILE`/`T_USER_TERMS_AGREEMENT`는
  `auth.users` 삭제 시 cascade로 자동 삭제 → `admin.deleteUser`로 최종 삭제(소셜 연동도 함께 해제됨)

### 5.5 구글 소셜 로그인 최초 가입 시

구글 로그인은 이메일만 바로 생기고 닉네임·약관동의가 없다. 콜백 이후 `T_USER_PROFILE`이 없으면
"프로필 완성" 단계가 필요:

- `GET /api/profile/me/status` — 내 프로필이 이미 있는지(신규 소셜 사용자인지) 확인
- `POST /api/profile/complete-social-signup { nickname, terms }` — 닉네임 설정 + 약관동의 기록
  (이메일/비밀번호는 이미 구글에서 처리됐으니 여기선 안 받음)

## 6. 확인이 필요한 부분 (기본값으로 가정하고 진행, 다르면 알려주세요)

1. **기본 프로필 이미지**: 지정하신 이미지가 없어서, Storage에 간단한 기본 아바타(회색 원+사람
   아이콘 SVG 1개)를 `profile-images/default.png`로 만들어 두고, `PROFILE_IMAGE_URL`이 null일 때
   프론트에서 이 경로로 대체하는 방식으로 가정. 브랜드 기본 이미지가 따로 있으면 나중에 교체.
2. **닉네임 규칙**: 2~20자, 한글/영문/숫자만(공백·특수문자 금지)으로 가정.
3. **비밀번호 규칙**: "영문·숫자·특수문자 조합 8자 이상"을 `영문 1개 이상 + 숫자 1개 이상 + 특수문자
   1개 이상 + 총 8자 이상`으로 해석.
4. **약관 본문 콘텐츠**: 실제 이용약관/개인정보처리방침 텍스트는 법무 검토 영역이라 이번 범위 밖 —
   API/DB는 "동의 여부·버전"만 기록.

## 7. 대상 파일 (신규)

```
supabase/ddl/T_USER_PROFILE.sql
supabase/ddl/T_TERMS.sql
supabase/ddl/T_USER_TERMS_AGREEMENT.sql
supabase/ddl/policies/T_USER_PROFILE_policies.sql
supabase/ddl/policies/T_TERMS_policies.sql
supabase/ddl/policies/T_USER_TERMS_AGREEMENT_policies.sql
supabase/seed/T_TERMS_seed.sql                          -- TOS/PRIVACY/LBS 초기 데이터

frontend/middleware.ts                                   -- 세션 자동 갱신("로그인 유지")
frontend/lib/validation/password.ts                      -- 비밀번호 규칙 정규식
frontend/lib/validation/nickname.ts                       -- 닉네임 규칙 정규식

frontend/app/api/auth/signup/route.ts                     -- 수정: 닉네임/이미지/약관 처리 추가
frontend/app/api/auth/password/reset-request/route.ts
frontend/app/api/auth/password/reset-confirm/route.ts

frontend/app/api/profile/route.ts                         -- GET, PATCH
frontend/app/api/profile/image/route.ts                   -- POST
frontend/app/api/profile/password/route.ts                -- PUT
frontend/app/api/profile/nickname-check/route.ts          -- GET
frontend/app/api/profile/me/status/route.ts                -- GET
frontend/app/api/profile/complete-social-signup/route.ts   -- POST
frontend/app/api/account/route.ts                          -- DELETE
```

## 8. 구현 순서 (단계별 커밋 + 검증)

1. ✅ DB 스키마 + RLS + Storage 버킷 생성 (커밋 `1b5c8e7`)
2. ✅ 회원가입 API 확장(닉네임/약관/이미지) + 닉네임 중복확인 API (커밋 `23ff750`)
3. ✅ 마이페이지 API(조회/닉네임변경/이미지업로드/비밀번호변경/탈퇴) (커밋 `b8816a4`) —
   회원가입용 `signUp`은 실제 확인 메일을 보내 Supabase 요율 제한(rate limit)에 걸리는 걸 확인해서,
   이후 마이페이지류 테스트는 Admin API로 이메일 확인 상태 사용자를 직접 만들어 검증함(메일 미발송).
4. ✅ 비밀번호 찾기/재설정 API — `@supabase/ssr`의 `createServerClient`가 `flowType: "pkce"`로
   고정돼 있음을 소스에서 확인(`node_modules/@supabase/ssr`), 그래서 재설정 이메일도 기존
   `/auth/callback`(`?code=` 방식)을 그대로 탄다. 세션 없는 상태의 검증(약한 비밀번호, 세션 없음
   401, 이메일 누락)은 확인 완료. **실제 이메일 링크 클릭까지의 최종 확인은 사용자가 브라우저로
   진행 필요**(구글 로그인 때와 동일한 이유 — 실제 클릭은 재현 불가).
5. ✅ 구글 소셜 최초가입 프로필완성 API + 세션 자동갱신 미들웨어("로그인 유지")

전체 5단계 완료. 남은 건 UI(화면) — 이번 계획서 범위 밖, 프론트 스캐폴딩 이후 별도 계획.

각 단계 끝날 때마다 계획서 진행상황을 업데이트하고, 다음 단계로 넘어가기 전에 간단히 확인받는다
(전체를 한 번에 승인받은 뒤엔 매 단계 재승인은 생략 — 대신 구현 후 결과를 계속 보고).

## 9. 검증 방법 (공통)

- 각 API를 `curl`로 직접 호출 — 성공/실패(중복 닉네임, 필수 약관 미동의, 약한 비밀번호 등) 케이스 모두.
- DB에 실제로 행이 생기는지 service_role 키로 재조회.
- anon 키로 다른 사용자의 `T_USER_PROFILE`이 안 보이는지(RLS 검증) 확인.
- 탈퇴 후 `auth.users`와 `T_USER_PROFILE`이 실제로 사라졌는지 확인.
