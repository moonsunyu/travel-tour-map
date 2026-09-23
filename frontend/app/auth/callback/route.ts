import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 구글 OAuth 동의, 비밀번호 재설정 이메일 링크 등에서 공통으로 돌아오는 콜백.
// code를 세션으로 교환해 쿠키에 저장한 뒤 next(없으면 홈)로 리다이렉트한다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(errorDescription)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent("인가 코드가 없습니다.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
