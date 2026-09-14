import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Next.js API Route/Server Component에서 쓰는 Supabase 클라이언트.
// 세션은 httpOnly 쿠키로 관리한다 (브라우저 localStorage에 토큰을 직접 두지 않음).
// anon(publishable) 키만 사용 — service_role 키는 절대 여기 두지 않는다 (RLS 완전 우회 키).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 호출된 경우 쿠키를 못 쓸 수 있음 — middleware가 세션 갱신을 대신 처리하면 무시해도 된다.
          }
        },
      },
    },
  );
}
