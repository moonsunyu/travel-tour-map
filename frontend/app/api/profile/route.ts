import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateNickname } from "@/lib/validation/nickname";

export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return apiError("로그인이 필요합니다.", 401);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("T_USER_PROFILE")
    .select("NICKNAME, PROFILE_IMAGE_URL")
    .eq("USER_ID", user.id)
    .maybeSingle();

  if (error) {
    return apiError(error.message, 500);
  }
  if (!data) {
    return apiError("프로필이 없습니다.", 404);
  }

  return apiSuccess(
    { email: user.email, nickname: data.NICKNAME, profileImageUrl: data.PROFILE_IMAGE_URL },
    "프로필 조회 성공",
  );
}

export async function PATCH(request: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return apiError("로그인이 필요합니다.", 401);
  }

  const { nickname } = await request.json();
  const nicknameError = validateNickname(nickname ?? "");
  if (nicknameError) {
    return apiError(nicknameError);
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("T_USER_PROFILE")
    .select("USER_ID")
    .eq("NICKNAME", nickname)
    .neq("USER_ID", user.id)
    .maybeSingle();

  if (existing) {
    return apiError("이미 사용 중인 닉네임입니다.", 409);
  }

  const { error } = await admin.from("T_USER_PROFILE").update({ NICKNAME: nickname }).eq("USER_ID", user.id);

  if (error) {
    const message = error.code === "23505" ? "이미 사용 중인 닉네임입니다." : error.message;
    return apiError(message, 409);
  }

  return apiSuccess({ nickname }, "닉네임이 변경되었습니다.");
}
