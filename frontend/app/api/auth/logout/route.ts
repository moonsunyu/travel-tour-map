import { apiError, apiSuccess } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return apiError(error.message, error.status ?? 400);
  }

  return apiSuccess(null, "로그아웃되었습니다.");
}
