import { apiError, apiSuccess } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

// 등록된 이메일로 비밀번호 재설정 링크 발송. 이메일이 실제로 존재하는지 여부와 무관하게
// 항상 같은 응답을 준다(Supabase Auth 기본 동작 — 계정 존재 여부 노출 방지).
export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) {
    return apiError("이메일을 입력해주세요.");
  }

  const origin = new URL(request.url).origin;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return apiError(error.message, 400);
  }

  return apiSuccess(null, "비밀번호 재설정 링크를 이메일로 보냈습니다.");
}
