import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

// 브라우저를 카카오 OAuth 동의 화면으로 리다이렉트한다. (성공 응답도 JSON이 아니라 302 리다이렉트)
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    return apiError(error?.message ?? "카카오 로그인 URL 생성에 실패했습니다.");
  }

  return NextResponse.redirect(data.url);
}
