# 계획서: 홀로트립 프론트엔드 UI 포팅 (로그인/회원가입 화면)

- 작성일: 2026-09-14
- 원본: `C:\Users\ans52\OneDrive\바탕 화면\홀로트립---혼여행-플랫폼` (Google AI Studio로 생성된 Vite+React 프로토타입)
- 관련 문서: [`auth-api-reference.md`](../guides/auth-api-reference.md), 인증 관련 계획서 3종(9/14)

## 1. 무엇을 (What)

원본 폴더의 React 컴포넌트를 우리 Next.js(`frontend/`) 프로젝트로 포팅해서, 메인 페이지 + 우측 상단
로그인/회원가입 버튼 + 로그인/회원가입/소셜가입/비밀번호재설정 모달 + 마이페이지(북마크 제외)를
**실제 백엔드 API와 연동**해서 동작하게 만든다.

## 2. 원본 프로토타입 분석 결과

- 우리 API 스펙(`auth-api-reference.md`)과 요청/응답 형식·에러 메시지·검증 규칙이 거의 1:1로 일치 —
  아마 이 스펙 문서를 기반으로 AI Studio에서 생성된 것으로 보인다.
- **단, `src/api/authService.ts`는 전부 localStorage 기반 가짜 API**다. 실제 fetch 호출이 하나도 없다.
- 개발 편의용 요소가 곳곳에 있음(전부 제거 대상): 이메일 인증 즉시완료 버튼, 빠른 테스트 계정 채우기
  버튼, 비밀번호 재설정 "이메일 링크 클릭 시뮬레이션" 버튼, `ApiInspector` 개발자 패널.
- `ProfileData`에 `soloStyle`/`soloLevel`/`bio` 필드가 있으나 **우리 DB(`T_USER_PROFILE`)엔 없는
  필드** — AI가 화면을 풍성하게 보이려고 임의로 추가한 것으로 보임. 제거 대상(기획 스펙에 없음).
- 구글 로그인이 완전히 가짜 시뮬레이션(실제 리다이렉트 없음) — 우리는 이미 진짜
  `GET /api/auth/google` 풀페이지 리다이렉트 + `/auth/callback` 콜백이 구현돼 있어, 흐름 자체를
  다시 짜야 한다(아래 5-3 참고).
- 비밀번호 재설정의 "새 비밀번호 입력" 단계가 모달 내부 상태 전환으로 돼 있으나, 실제로는 **이메일
  링크를 타고 완전히 새로 페이지 로드되면서 도착**하므로 별도 페이지(`/reset-password`)로 분리해야
  실제 흐름과 맞는다.
- 사용자 확인 사항 반영: **마이페이지는 포함, 북마크/장소리스트 탭은 제외** (아직 장소 데이터 연동 전),
  **ApiInspector는 제외**.

## 3. 범위 (Scope)

포함:
- 메인 페이지 (로그인 전/후 상태 분기)
- Navbar (로고, 로그인/회원가입 버튼, 로그인 후 아바타+닉네임+마이페이지 링크+로그아웃)
- Footer (약관 링크)
- 인증 모달: 로그인, 회원가입, 구글 소셜 최초가입 프로필완성, 비밀번호 재설정 요청, 약관 전문보기
- `/reset-password` 페이지 (이메일 링크로 도착하는 새 비밀번호 설정 화면, 신규)
- 마이페이지: 프로필(닉네임 수정·이미지 업로드), 보안(비밀번호 변경), 회원탈퇴, 약관 동의 내역 탭
  (**북마크 탭 제외**)
- 실제 API 연동 (localStorage mock 완전 제거)

제외:
- 북마크/장소리스트/지도 (`SoloExplore`, `SoloSpotDetailModal`, `soloSpots.ts`, `toggleBookmark`) —
  장소 데이터가 아직 프론트에 연동 전. 나중에 별도 계획으로.
- `ApiInspector` 개발자 패널
- `soloStyle`/`soloLevel`/`bio` 등 우리 스펙에 없는 프로필 필드
- 이메일 인증 즉시완료, 테스트 계정 자동입력 등 모든 개발용 편의 버튼

## 4. 파일 매핑

| 원본 | 목적지 | 주요 변경 |
|---|---|---|
| `src/types.ts` | `frontend/lib/types.ts` | `soloStyle/soloLevel/bio`, `SoloSpot`, `ApiLogEntry` 제거 |
| `src/data/termsText.ts` | `frontend/lib/termsText.ts` | 그대로 |
| `src/api/authService.ts` | `frontend/lib/authClient.ts` | **전면 재작성** — localStorage → 실제 `fetch('/api/...')`. `confirmEmailForUser` 제거 |
| `src/context/AuthContext.tsx` | `frontend/context/AuthContext.tsx` | 초기 로드 로직 재작성(아래 5-2), `confirmEmailShortcut` 제거, `toggleBookmark`/`savedBookmarks` 제거 |
| `src/components/Navbar.tsx` | `frontend/components/Navbar.tsx` | `onNavigate` → Next.js `<Link>`/`useRouter` |
| `src/components/Footer.tsx` | `frontend/components/Footer.tsx` | 그대로 |
| `src/components/auth/AuthModal.tsx` | `frontend/components/auth/AuthModal.tsx` | 그대로 (reset-confirm 모드 제거) |
| `src/components/auth/LoginForm.tsx` | `frontend/components/auth/LoginForm.tsx` | 빠른 테스트계정 버튼 제거 |
| `src/components/auth/SignupForm.tsx` | `frontend/components/auth/SignupForm.tsx` | "테스트 바로가기 인증완료" 버튼 제거 |
| `src/components/auth/SocialCompleteForm.tsx` | `frontend/components/auth/SocialCompleteForm.tsx` | 그대로 |
| `src/components/auth/PasswordResetForm.tsx` | `frontend/components/auth/PasswordResetForm.tsx` | **요청 단계만 남김**(confirm 단계는 `/reset-password` 페이지로 이동) |
| `src/components/auth/TermsDetailModal.tsx` | `frontend/components/auth/TermsDetailModal.tsx` | 그대로 |
| `src/components/profile/MyPage.tsx` | `frontend/components/profile/MyPage.tsx` | 북마크 탭/관련 로직 제거, `soloStyle/soloLevel` 배지 제거 |
| (신규) | `frontend/app/reset-password/page.tsx` | `PasswordResetForm`의 confirm 단계 UI를 페이지로 재구성 |
| (신규) | `frontend/app/mypage/page.tsx` | 실제 라우트로 분리 (원본은 클라이언트 상태로만 전환) |
| `src/App.tsx`의 메인뷰 부분 | `frontend/app/page.tsx` | 로그인 전/후 히어로 섹션 |
| Navbar/Footer/AuthModal 조립 | `frontend/app/layout.tsx` | 모든 페이지 공통이라 루트 레이아웃에 배치 |

- 아이콘: `lucide-react` 신규 설치 필요 (원본과 동일 패키지, 이미 우리 `package.json`의 Tailwind v4와도 호환).
- 폰트: `index.html`의 Pretendard CDN 링크를 `frontend/app/layout.tsx`의 `<head>`로 이식.

## 5. 핵심 재설계 포인트 (mock → 실제 연동)

### 5-1. `authClient.ts` — 실제 API 호출로 전면 재작성
모든 메서드가 `fetch('/api/...', { method, headers, body })`로 우리 실제 라우트를 호출하도록 재작성.
쿠키는 동일 출처(same-origin) 요청이라 브라우저가 자동으로 실어보낸다(별도 설정 불필요). 응답 형식
`{success,data,message}`은 이미 동일해서 타입은 거의 그대로 재사용 가능.

### 5-2. 로그인 상태 판별 (AuthContext 초기 로드)
localStorage 세션 대신, 앱이 뜰 때마다 `GET /api/profile`을 호출해서 판별:
- `200` → 로그인 + 프로필 있음 → `user` 세팅
- `401` → 로그인 안 됨
- `404`("프로필이 없습니다") → **로그인은 됐지만 프로필 미완성**(구글 최초가입 직후) →
  `social-complete` 모달 자동 오픈

### 5-3. 구글 로그인 흐름
원본의 가짜 `startGoogleLogin()`(즉시 완료) 대신, 실제로는:
1. 버튼 클릭 시 `window.location.href = '/api/auth/google'` (풀페이지 이동, Promise 아님)
2. 구글 인증 → `/auth/callback` → 세션 쿠키 설정 → 우리 앱으로 리다이렉트
3. 앱이 다시 로드되면서 5-2의 초기 로드 로직이 자동으로 "프로필 없음"을 감지해 `social-complete` 모달을 띄움

`/auth/callback`이 실패 시 보내는 `/?auth_error=<메시지>`도 처리 — 메인 페이지 로드시 쿼리 파싱해서
로그인 모달에 에러로 표시 후 URL 정리.

### 5-4. 비밀번호 재설정 — confirm 단계를 페이지로 분리
- 모달의 `PasswordResetForm`은 "이메일 입력 → 발송 완료 안내"까지만.
- 이메일 링크 → `/auth/callback?next=/reset-password` → 세션 쿠키 설정된 채 `/reset-password` 페이지
  도착 → 거기서 새 비밀번호 입력 폼(원본 모달의 'confirm' 스텝 UI 재사용) → `POST
  /api/auth/password/reset-confirm` 호출.

## 6. 검증 방법

- `npx tsc --noEmit`, `npm run lint`로 타입/린트 통과 확인 (지금까지와 동일한 최소 기준)
- `npm run build`로 프로덕션 빌드 성공 확인 (컴포넌트 수가 많아 빌드 에러 가능성 있음)
- Node 스크립트/curl로 각 페이지가 200을 반환하고 예상 요소(로그인/회원가입 버튼 텍스트 등)가
  HTML에 포함되는지 확인
- 실제 회원가입 → 로그인 → 마이페이지(닉네임 변경, 이미지 업로드, 비밀번호 변경) → 회원탈퇴까지
  Node 스크립트로 end-to-end 시나리오 실행 (지금까지 API 검증 때와 같은 방식, 이번엔 UI가 만든 실제
  요청을 흉내내는 대신 페이지가 만들어내는 결과물 자체를 확인)
- **시각적 확인은 사용자 몫**: 브라우저 상호작용(모달 열기/닫기, 애니메이션, 실제 클릭 흐름)은
  제가 완전히 재현할 수 없어 마지막에 직접 확인 요청 — 필요하면 `run` 스킬로 개발 서버를 띄워
  스크린샷까지 시도해볼 수 있음.

## 7. 대상 파일 요약

약 15개 컴포넌트 신규 생성 + `layout.tsx`/`page.tsx` 수정 + `package.json`(lucide-react 추가).
큰 작업이라 아래 순서로 나눠 커밋:
1. 타입/데이터/authClient 기반 레이어
2. AuthContext + 레이아웃(Navbar/Footer) 조립
3. 인증 모달 5종(Login/Signup/SocialComplete/PasswordReset/TermsDetail)
4. 메인 페이지 + `/reset-password` 페이지
5. 마이페이지(`/mypage`)
