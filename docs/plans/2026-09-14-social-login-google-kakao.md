# 계획서: 구글·카카오 소셜 로그인 추가 (Supabase Auth OAuth)

- 작성일: 2026-09-14
- 관련 계획서: [`2026-09-14-auth-login-signup-api.md`](2026-09-14-auth-login-signup-api.md) (이메일/비밀번호 로그인 API, 선행 작업)
- 범위 확정: 구글·카카오만 진행. **애플·네이버는 이번 범위에서 제외**(애플은 유료 개발자 계정 필요, 네이버는 Supabase 미지원이라 별도 우회 구현 필요 — 사용자 확인 완료).

## 1. 무엇을 (What)

기존 이메일/비밀번호 로그인 API에 이어, Supabase Auth의 OAuth 기능으로 구글·카카오 소셜 로그인을 추가한다.

## 2. 왜 (Why)

기획 스택의 "로그인/회원가입" 요구사항 중 소셜 로그인 확장. 이메일/비밀번호와 동일하게 Supabase Auth
안에서 처리되므로 별도 인증 서버 없이 확장 가능.

## 3. 이 계획서만으로는 끝낼 수 없는 부분 (사용자 작업 필요) ✋

아래는 **Claude가 대신 할 수 없는 작업**입니다 — 각 플랫폼 개발자 콘솔/Supabase 대시보드에 직접
로그인해서 수행해야 합니다. 이 단계 없이는 코드를 완성해도 실제로 동작하지 않습니다.

### 3.1 구글
1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 생성(또는 기존 프로젝트) → "APIs & Services" → "Credentials"
2. "Create Credentials" → "OAuth client ID" → Application type: **Web application**
3. Authorized redirect URI에 아래 값을 정확히 추가:
   ```
   https://hkndfhdihzchiqxnidat.supabase.co/auth/v1/callback
   ```
4. 발급된 **Client ID**와 **Client Secret**을 복사해둔다.

### 3.2 카카오
1. [Kakao Developers](https://developers.kakao.com/) → 애플리케이션 추가
2. "카카오 로그인" 활성화, Redirect URI에 위와 동일한 값 등록:
   ```
   https://hkndfhdihzchiqxnidat.supabase.co/auth/v1/callback
   ```
3. "보안" 탭에서 Client Secret 생성 후, **REST API 키**와 **Client Secret**을 복사해둔다.

### 3.3 Supabase 대시보드
1. Authentication → Providers → **Google** 활성화 → 3.1의 Client ID/Secret 입력 → Save
2. Authentication → Providers → **Kakao** 활성화 → 3.2의 REST API 키/Client Secret 입력 → Save

> 이 3단계(3.1~3.3)를 완료하신 뒤 알려주시면, 코드 쪽(아래 4번)을 실행/검증합니다.

## 4. Claude가 구현하는 부분 (코드)

기존 API 스타일(회원가입/로그인/로그아웃과 동일하게 "API 먼저")을 유지 — 아직 UI 버튼 없이, 라우트
자체를 curl로 호출해 리다이렉트 URL이 정상 생성되는지까지 검증한다.

```
frontend/app/api/auth/google/route.ts   -- GET: 구글 OAuth 동의 화면으로 302 리다이렉트
frontend/app/api/auth/kakao/route.ts    -- GET: 카카오 OAuth 동의 화면으로 302 리다이렉트
frontend/app/auth/callback/route.ts     -- GET: OAuth 콜백 — code를 세션으로 교환 후 리다이렉트
```

- `signInWithOAuth({ provider, options: { redirectTo } })` 호출 후 반환되는 `data.url`로 302 리다이렉트.
- 콜백 라우트는 `exchangeCodeForSession(code)`로 세션 쿠키를 설정하고 홈(`/`)으로 리다이렉트.
- 로그인 실패 시 에러 메시지와 함께 리다이렉트(추후 UI에서 표시할 수 있게 쿼리 파라미터로 전달).

## 5. 검증 방법

- **자동 검증(Claude)**: `/api/auth/google`, `/api/auth/kakao`를 curl로 호출해 302 응답과 `Location`
  헤더가 각각 `accounts.google.com`, `kauth.kakao.com` 도메인의 정상적인 인가 URL(client_id 포함)을
  가리키는지 확인.
- **수동 검증(사용자, 브라우저 필요)**: 실제 동의 화면 클릭 → 로그인 → 콜백 처리 → 세션 쿠키 생성까지는
  브라우저 상호작용이 필요해 Claude가 curl로 완전히 재현할 수 없음. 3단계 설정 완료 후 브라우저에서
  `http://localhost:3000/api/auth/google`(또는 `/kakao`)에 직접 접속해 로그인이 끝까지 되는지 사용자가
  최종 확인 필요.

## 6. 대상 파일 (신규)

- `frontend/app/api/auth/google/route.ts`
- `frontend/app/api/auth/kakao/route.ts`
- `frontend/app/auth/callback/route.ts`
