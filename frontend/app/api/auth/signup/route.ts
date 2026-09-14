import { apiError, apiSuccess } from "@/lib/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateNickname } from "@/lib/validation/nickname";
import { validatePassword } from "@/lib/validation/password";

type TermInput = { code: string; agreed: boolean };

export async function POST(request: Request) {
  const body = await request.json();
  const email: string | undefined = body.email;
  const password: string | undefined = body.password;
  const nickname: string | undefined = body.nickname?.trim();
  const profileImageUrl: string | null = body.profileImageUrl ?? null;
  const terms: TermInput[] = Array.isArray(body.terms) ? body.terms : [];

  if (!email || !password || !nickname) {
    return apiError("이메일, 비밀번호, 닉네임을 모두 입력해주세요.");
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return apiError(passwordError);
  }

  const nicknameError = validateNickname(nickname);
  if (nicknameError) {
    return apiError(nicknameError);
  }

  const admin = createAdminClient();

  // 약관 마스터 조회 — 필수 항목 전부 동의했는지 확인하고, 각 항목의 현재 버전을 스냅샷으로 남긴다.
  const { data: termsMaster, error: termsError } = await admin
    .from("T_TERMS")
    .select("TERM_CODE, IS_REQUIRED, VERSION");

  if (termsError) {
    return apiError(termsError.message, 500);
  }

  const agreedCodes = new Set(terms.filter((t) => t.agreed).map((t) => t.code));
  const missingRequired = (termsMaster ?? []).filter((t) => t.IS_REQUIRED && !agreedCodes.has(t.TERM_CODE));
  if (missingRequired.length > 0) {
    return apiError(`필수 약관에 동의해주세요: ${missingRequired.map((t) => t.TERM_CODE).join(", ")}`);
  }

  // 닉네임 사전 중복확인 (레이스 컨디션까지 막는 완전한 원자성은 아님 — UNQ 제약이 최종 방어선).
  const { data: existingNickname } = await admin
    .from("T_USER_PROFILE")
    .select("USER_ID")
    .eq("NICKNAME", nickname)
    .maybeSingle();

  if (existingNickname) {
    return apiError("이미 사용 중인 닉네임입니다.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return apiError(error.message, error.status ?? 400);
  }

  if (!data.user) {
    return apiError("회원가입에 실패했습니다.", 500);
  }

  const userId = data.user.id;

  const { error: profileError } = await admin.from("T_USER_PROFILE").insert({
    USER_ID: userId,
    NICKNAME: nickname,
    PROFILE_IMAGE_URL: profileImageUrl,
  });

  if (profileError) {
    // 프로필 생성 실패(닉네임 중복 등) 시 방금 만든 Auth 사용자를 되돌려 고아 계정을 남기지 않는다.
    await admin.auth.admin.deleteUser(userId);
    const message = profileError.code === "23505" ? "이미 사용 중인 닉네임입니다." : profileError.message;
    return apiError(message, 409);
  }

  const versionByCode = new Map((termsMaster ?? []).map((t) => [t.TERM_CODE, t.VERSION]));
  const agreementRows = terms
    .filter((t) => versionByCode.has(t.code))
    .map((t) => ({
      USER_ID: userId,
      TERM_CODE: t.code,
      AGREED: t.agreed,
      AGREED_VERSION: versionByCode.get(t.code),
    }));

  if (agreementRows.length > 0) {
    const { error: agreementError } = await admin.from("T_USER_TERMS_AGREEMENT").insert(agreementRows);
    if (agreementError) {
      // 약관 동의 기록 실패는 계정 자체를 되돌릴 만큼 치명적이진 않으므로, 계정은 유지하고 에러만 알린다.
      return apiError(`회원가입은 완료됐지만 약관 동의 기록에 실패했습니다: ${agreementError.message}`, 500);
    }
  }

  return apiSuccess({ user: data.user, nickname }, "회원가입이 완료되었습니다.");
}
