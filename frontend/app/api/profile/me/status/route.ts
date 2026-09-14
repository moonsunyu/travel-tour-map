import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// 구글 로그인은 이메일만 바로 생기고 닉네임/약관동의가 없다. 콜백 이후 프론트가
// 이 API로 "프로필 완성"이 필요한 신규 소셜 사용자인지 판단한다.
export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return apiError("로그인이 필요합니다.", 401);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("T_USER_PROFILE")
    .select("USER_ID")
    .eq("USER_ID", user.id)
    .maybeSingle();

  if (error) {
    return apiError(error.message, 500);
  }

  return apiSuccess({ hasProfile: !!data }, data ? "프로필이 있습니다." : "프로필 완성이 필요합니다.");
}
