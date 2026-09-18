import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validatePassword } from "@/lib/validation/password";

// 마이페이지에서의 비밀번호 변경. 비밀번호 재설정(찾기)과 달리 현재 비밀번호를 알고 있는
// 상태이므로, 재확인 절차를 거친다(세션 탈취 등에 대비한 방어적 검증).
export async function PUT(request: Request) {
  const user = await getAuthedUser();
  if (!user || !user.email) {
    return apiError("로그인이 필요합니다.", 401);
  }

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return apiError("현재 비밀번호와 새 비밀번호를 모두 입력해주세요.");
  }

  const newPasswordError = validatePassword(newPassword);
  if (newPasswordError) {
    return apiError(newPasswordError);
  }

  // 세션 쿠키를 건드리지 않는 별도 클라이언트로 현재 비밀번호만 확인한다.
  const verifyClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return apiError("현재 비밀번호가 일치하지 않습니다.", 401);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return apiError(error.message, 400);
  }

  return apiSuccess(null, "비밀번호가 변경되었습니다.");
}
