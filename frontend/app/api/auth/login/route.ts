import { apiError, apiSuccess } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return apiError("이메일과 비밀번호를 모두 입력해주세요.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return apiError(error.message, error.status ?? 401);
  }

  return apiSuccess({ user: data.user }, "로그인되었습니다.");
}
