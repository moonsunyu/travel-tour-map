import { createBrowserClient } from "@supabase/ssr";

// 클라이언트 컴포넌트("use client")에서 쓰는 Supabase 클라이언트.
// 세션 쿠키는 브라우저가 자동으로 들고 있으므로 server.ts처럼 cookies()를 다룰 필요가 없다.
// anon(publishable) 키만 사용 — 로그인 여부와 무관한 공개 데이터 조회(지도, 검색 등)에 쓴다.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}