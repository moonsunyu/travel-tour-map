import { apiError, apiSuccess } from "@/lib/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateNickname } from "@/lib/validation/nickname";

// 회원가입/닉네임 변경 전 사전 중복확인. 아직 로그인 전(회원가입 중)에도 호출돼야 하므로
// admin 클라이언트로 조회한다(RLS는 본인 행만 보이게 돼 있어 일반 세션으론 중복확인 불가).
export async function GET(request: Request) {
  const nickname = new URL(request.url).searchParams.get("nickname")?.trim() ?? "";

  const validationError = validateNickname(nickname);
  if (validationError) {
    return apiError(validationError);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("T_USER_PROFILE")
    .select("USER_ID")
    .eq("NICKNAME", nickname)
    .maybeSingle();

  if (error) {
    return apiError(error.message, 500);
  }

  return apiSuccess({ available: !data }, data ? "이미 사용 중인 닉네임입니다." : "사용 가능한 닉네임입니다.");
}
