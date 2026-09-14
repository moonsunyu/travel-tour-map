# 인증/회원 API 레퍼런스

`frontend/app/api/`에 구현된 인증·회원 관련 API 전체 목록. UI 없이 API만 먼저 구현된 상태라,
프론트 작업 시작 시 이 문서를 기준으로 화면을 붙이면 된다.

관련 계획서: [`2026-09-14-auth-login-signup-api.md`](../plans/2026-09-14-auth-login-signup-api.md),
[`2026-09-14-social-login-google-kakao.md`](../plans/2026-09-14-social-login-google-kakao.md),
[`2026-09-14-user-profile-account-api.md`](../plans/2026-09-14-user-profile-account-api.md)

## 공통 사항

**응답 규격** — 모든 API(리다이렉트 제외)는 아래 형식의 JSON을 반환한다.
```json
{ "success": true, "data": { ... }, "message": "사람이 읽을 안내 문구" }
```
실패 시 `success: false`, `data: null`, HTTP 상태 코드는 400/401/404/409/500 중 하나.

**인증 방식** — 로그인 성공 시 서버가 httpOnly 쿠키로 세션을 내려준다. 프론트는 토큰을 직접
다루지 않고, 모든 요청에 쿠키가 자동으로 실려가게(`credentials: 'include'` 또는 동일 출처 fetch)만
하면 된다. "로그인이 필요합니다"(401)가 뜨면 세션이 없거나 만료된 것.

**로그인 유지** — `frontend/middleware.ts`가 매 요청마다 만료된 Access Token을 자동 갱신한다.
별도로 신경 쓸 필요 없음.

---

## 1. 회원가입 / 로그인 / 로그아웃

### `POST /api/auth/signup` — 이메일 회원가입
```json
// Request
{
  "email": "user@example.com",
  "password": "Aa1!aaaa",
  "nickname": "홍길동",
  "profileImageUrl": null,
  "terms": [
    { "code": "TOS", "agreed": true },
    { "code": "PRIVACY", "agreed": true },
    { "code": "LBS", "agreed": false }
  ]
}
```
- 비밀번호: 영문+숫자+특수문자 조합 8자 이상 아니면 400
- `terms`: `IS_REQUIRED=true`인 약관(TOS, PRIVACY)을 전부 `agreed:true`로 안 보내면 400
- 닉네임 중복 시 409
- 성공 시 확인 이메일 발송됨(가입 직후엔 로그인 불가 — 이메일 인증 필요, 아래 참고)
```json
// Response 200
{ "success": true, "data": { "user": { "id": "...", "email": "..." }, "nickname": "홍길동" }, "message": "회원가입이 완료되었습니다." }
```

### `POST /api/auth/login` — 이메일 로그인
```json
{ "email": "user@example.com", "password": "Aa1!aaaa" }
```
- 이메일 미인증 상태면 400 `"Email not confirmed"`
- 성공 시 세션 쿠키 설정

### `POST /api/auth/logout`
바디 없음. 세션 쿠키 제거.

### `GET /api/auth/google` — 구글 소셜 로그인 시작
브라우저 주소창에서 직접 이동(`<a href>` 또는 `location.href`)하는 용도 — fetch로 호출하는 API가
아니라 사람이 클릭해서 구글 로그인 화면으로 리다이렉트되는 진입점. 성공하면 `/auth/callback`을 거쳐
세션이 생기고 홈(`/`)으로 돌아온다. 실패 시 `/?auth_error=<메시지>`로 리다이렉트.

> 카카오는 Supabase의 카카오 연동이 이메일 권한(`account_email`)을 고정 요청하는데 이 프로젝트의
> 카카오 앱엔 그 권한이 없어 `invalid_scope`로 막혀서 **제외**했다 (자세한 경위는
> [`2026-09-14-social-login-google-kakao.md`](../plans/2026-09-14-social-login-google-kakao.md) 8번).

### 구글 최초 로그인 시 — 프로필 완성 필요

구글 로그인은 이메일만 바로 생기고 닉네임·약관동의가 없다. 로그인 직후 아래 순서로 처리:

1. `GET /api/profile/me/status` → `{ "hasProfile": false }`면 프로필 완성 화면으로 보낸다.
2. `POST /api/profile/complete-social-signup`
   ```json
   { "nickname": "홍길동", "terms": [{ "code": "TOS", "agreed": true }, { "code": "PRIVACY", "agreed": true }] }
   ```
   이미 프로필이 있으면 409.

---

## 2. 비밀번호 찾기 / 재설정

### `POST /api/auth/password/reset-request`
```json
{ "email": "user@example.com" }
```
등록 여부와 무관하게 항상 같은 성공 응답(계정 존재 노출 방지). 실제 이메일은 등록된 계정에만 발송.
링크 클릭 시 `/auth/callback`을 거쳐 재설정 전용 세션이 생기고 `/reset-password`로 이동한다
(이 프론트 페이지는 아직 미구현 — UI 작업 시 필요).

### `POST /api/auth/password/reset-confirm`
```json
{ "password": "Bb2@bbbb" }
```
- 위 이메일 링크를 거쳐 생긴 재설정 세션이 있어야 동작(없으면 401).
- 현재 비밀번호는 필요 없음(이메일 소유가 본인확인을 대신함).

---

## 3. 마이페이지 (로그인 필요)

### `GET /api/profile` — 내 프로필 조회
```json
{ "success": true, "data": { "email": "user@example.com", "nickname": "홍길동", "profileImageUrl": null }, "message": "프로필 조회 성공" }
```

### `PATCH /api/profile` — 닉네임 변경
```json
{ "nickname": "새닉네임" }
```
중복이면 409.

### `GET /api/profile/nickname-check?nickname=xxx` — 닉네임 중복확인 (로그인 불필요)
```json
{ "success": true, "data": { "available": true }, "message": "사용 가능한 닉네임입니다." }
```
회원가입/닉네임변경 전 실시간 확인용.

### `POST /api/profile/image` — 프로필 이미지 업로드
`multipart/form-data`, 필드명 `file`. jpg/png/webp만, 5MB 이하.
```ts
const form = new FormData();
form.append("file", fileInput.files[0]);
await fetch("/api/profile/image", { method: "POST", body: form });
```
```json
{ "success": true, "data": { "profileImageUrl": "https://.../profile-images/<user_id>/<timestamp>.png" }, "message": "프로필 이미지가 변경되었습니다." }
```

### `PUT /api/profile/password` — 비밀번호 변경 (마이페이지)
```json
{ "currentPassword": "Aa1!aaaa", "newPassword": "Bb2@bbbb" }
```
현재 비밀번호가 틀리면 401. (비밀번호 찾기/재설정과 달리 로그인된 상태에서 현재 비밀번호 재확인 필요)

### `DELETE /api/account` — 회원탈퇴
바디 없음. 프로필 이미지(Storage) 삭제 → `auth` 계정 삭제(소셜 연동 해제 포함) → 프로필/약관동의
행은 DB에서 자동 정리(on delete cascade). 되돌릴 수 없음.

---

## 4. 기본 프로필 이미지

`PROFILE_IMAGE_URL`이 `null`이면(회원가입 시 안 정했거나 아직 안 바꾼 경우), 프론트에서 아래
고정 URL로 대체해서 보여주면 된다:
```
https://hkndfhdihzchiqxnidat.supabase.co/storage/v1/object/public/profile-images/default.svg
```

---

## 5. 에러 메시지 빠른 참고

| 메시지 | 상황 |
|---|---|
| "로그인이 필요합니다." | 세션 쿠키 없음/만료 (401) |
| "이미 사용 중인 닉네임입니다." | 닉네임 중복 (409) |
| "필수 약관에 동의해주세요: PRIVACY" | 필수 약관 미동의 — 어떤 코드가 빠졌는지 알려줌 (400) |
| "비밀번호는 영문, 숫자, 특수문자를 모두 포함해 8자 이상이어야 합니다." | 비밀번호 규칙 위반 (400) |
| "닉네임은 한글/영문/숫자만 사용해 2~20자로 입력해주세요." | 닉네임 규칙 위반 (400) |
| "현재 비밀번호가 일치하지 않습니다." | 마이페이지 비밀번호 변경 시 현재 비밀번호 오입력 (401) |
| "Email not confirmed" | 이메일 인증 전 로그인 시도 (400, Supabase 원문 메시지) |
