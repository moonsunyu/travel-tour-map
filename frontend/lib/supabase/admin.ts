import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role 키를 쓰는 관리자 클라이언트. RLS를 완전히 우회하므로
// **서버 코드(API Route)에서만** 쓰고, 클라이언트 번들에 절대 노출하지 않는다
// (SUPABASE_SERVICE_ROLE_KEY는 NEXT_PUBLIC_ 접두어가 없어 브라우저로 안 나감).
// 회원가입/탈퇴처럼 세션이 아직 없거나(이메일 미인증) auth.users를 직접 다뤄야
// 하는 작업에만 쓴다 — 일반 사용자 데이터 조회는 세션 기반 클라이언트(server.ts) 사용.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
