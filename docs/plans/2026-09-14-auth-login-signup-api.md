# 계획서: Next.js 스캐폴딩 + 로그인/회원가입 API (Supabase Auth)

- 작성일: 2026-09-14
- 근거: 기획 스택 "프론트엔드(로그인/회원가입 + ...) React+Next.js+TailwindCSS", "스탬프 투어: Supabase Auth + Storage"

## 1. 무엇을 (What)

1. `frontend/`에 React+Next.js+TailwindCSS 프로젝트를 `create-next-app`으로 스캐폴딩한다.
2. Supabase Auth를 이용한 로그인/회원가입 API(Next.js API Route)를 구현한다. UI 화면은 이번 범위에 포함하지 않는다 — 사용자가 "백엔드(API) 먼저" 진행을 요청함.

## 2. 왜 (Why)

- 기획 스택에 이미 인증 방식으로 Supabase Auth가 지정돼 있어(스탬프 투어 항목), 별도 JWT 서버 없이 Supabase Auth를 그대로 씀 — DB도 같은 Supabase라 연동이 가장 단순함.
- 사용자가 UI보다 API를 먼저 만들고, 회원가입에 필요한 추가 필드·validation 규칙은 추후 알려주겠다고 명시함.

## 3. 범위 (Scope)

포함 (MVP):
- `create-next-app` 스캐폴딩 — TypeScript + TailwindCSS + App Router
- `@supabase/ssr`, `@supabase/supabase-js` 설치 (Next.js 공식 권장 방식 — 쿠키 기반 세션 관리)
- API Route 3개: 회원가입(`POST /api/auth/signup`), 로그인(`POST /api/auth/login`), 로그아웃(`POST /api/auth/logout`)
- 필드는 이메일 + 비밀번호만 (Supabase Auth 기본 제공 범위). 비밀번호 최소 길이 등은 Supabase 프로젝트의 기본 설정을 따름.
- 표준 JSON 응답 형식 `{ success, data, message }` 적용 (`backend-service-architecture` §1 API 응답 규격 준용)

제외 (다음 단계로 미룸 — 사용자가 추후 제공 예정):
- 닉네임 등 추가 회원가입 필드, 세부 validation 규칙(에러 메시지 등)
- 로그인/회원가입 UI 화면
- 소셜 로그인, 비밀번호 재설정 등 부가 기능

## 4. 아키텍처

```
frontend/
  app/
    api/auth/signup/route.ts   -- POST { email, password } -> Supabase Auth signUp
    api/auth/login/route.ts    -- POST { email, password } -> Supabase Auth signInWithPassword
    api/auth/logout/route.ts   -- POST -> Supabase Auth signOut
  lib/supabase/server.ts       -- @supabase/ssr 서버용 클라이언트 (쿠키 세션)
  .env.local                  -- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (직접 채워야 함, 커밋 안 됨)
```

- 클라이언트는 **anon(publishable) 키**만 사용 (service_role 키는 절대 프론트에 두지 않음 — RLS를 완전히 우회하는 키).
- 세션은 `@supabase/ssr`이 관리하는 httpOnly 쿠키에 저장 (브라우저 localStorage에 토큰을 직접 두지 않음).

## 5. 대상 파일 (신규)

- `frontend/` 전체 (create-next-app 산출물)
- `frontend/app/api/auth/signup/route.ts`
- `frontend/app/api/auth/login/route.ts`
- `frontend/app/api/auth/logout/route.ts`
- `frontend/lib/supabase/server.ts`
- `frontend/.env.local` (gitignore 대상, 값은 직접 입력 필요)

## 6. 검증 방법

- `npm run dev`로 로컬 서버 기동 후 `curl`로 각 API 호출:
  - 회원가입 → Supabase 대시보드 Authentication 탭에 사용자 생성 확인
  - 로그인 → 성공 시 세션 쿠키 설정 확인
  - 로그아웃 → 세션 쿠키 제거 확인
- 잘못된 이메일/짧은 비밀번호로 회원가입 시도 시 에러 응답 확인

## 7. 확인 필요 사항

- 회원가입 시 이메일 인증(컨펌 메일) 요구 여부는 Supabase 프로젝트의 기본 Auth 설정을 그대로 따름 (별도로 끄거나 바꾸지 않음). 필요시 사용자가 대시보드에서 직접 조정.
- 추가 필드·validation 규칙은 사용자가 추후 제공 시 별도 계획서로 반영.
