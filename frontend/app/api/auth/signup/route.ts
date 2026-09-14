import { apiError, apiSuccess } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return apiError("이메일과 비밀번호를 모두 입력해주세요.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return apiError(error.message, error.status ?? 400);
  }

  return apiSuccess({ user: data.user }, "회원가입이 완료되었습니다.");
}
