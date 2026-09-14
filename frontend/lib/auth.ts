import { createClient } from "@/lib/supabase/server";

// 세션 쿠키에서 로그인한 사용자를 가져온다. 마이페이지류 API가 공통으로 쓰는 인증 확인.
export async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }
  return user;
}
