import { apiError, apiSuccess } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { validatePassword } from "@/lib/validation/password";

// 이메일 링크(/auth/callback)를 거쳐 recovery 세션이 이미 쿠키에 있는 상태에서 호출한다.
// 현재 비밀번호는 몰라도 된다 — 이메일 링크 클릭 자체가 본인 확인을 대신한다.
export async function POST(request: Request) {
  const { password } = await request.json();

  const passwordError = validatePassword(password ?? "");
  if (passwordError) {
    return apiError(passwordError);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("재설정 세션이 유효하지 않습니다. 이메일 링크를 다시 요청해주세요.", 401);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return apiError(error.message, 400);
  }

  return apiSuccess(null, "비밀번호가 재설정되었습니다.");
}
