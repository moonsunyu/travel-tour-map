import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "profile-images";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return apiError("로그인이 필요합니다.", 401);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return apiError("이미지 파일이 필요합니다.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return apiError("jpg, png, webp 형식만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_SIZE) {
    return apiError("이미지 용량은 5MB 이하만 가능합니다.");
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return apiError(uploadError.message, 500);
  }

  const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(path);

  const { error: updateError } = await admin
    .from("T_USER_PROFILE")
    .update({ PROFILE_IMAGE_URL: publicUrlData.publicUrl })
    .eq("USER_ID", user.id);

  if (updateError) {
    return apiError(updateError.message, 500);
  }

  return apiSuccess({ profileImageUrl: publicUrlData.publicUrl }, "프로필 이미지가 변경되었습니다.");
}
