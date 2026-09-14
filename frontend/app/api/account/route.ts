import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "profile-images";

// 회원탈퇴: 업로드했던 프로필 이미지 삭제 → auth.users 삭제(소셜 연동도 함께 해제).
// T_USER_PROFILE, T_USER_TERMS_AGREEMENT는 on delete cascade로 자동 정리된다.
export async function DELETE() {
  const user = await getAuthedUser();
  if (!user) {
    return apiError("로그인이 필요합니다.", 401);
  }

  const admin = createAdminClient();

  const { data: files } = await admin.storage.from(BUCKET).list(user.id);
  if (files && files.length > 0) {
    await admin.storage.from(BUCKET).remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return apiError(error.message, 500);
  }

  return apiSuccess(null, "회원 탈퇴가 완료되었습니다.");
}
