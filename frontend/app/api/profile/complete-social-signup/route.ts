import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAgreementRows, findMissingRequiredTerms, loadTermsMaster } from "@/lib/terms";
import { validateNickname } from "@/lib/validation/nickname";

type TermInput = { code: string; agreed: boolean };

// 구글 로그인 최초 가입 시, 이메일/비밀번호는 이미 구글이 처리했으니 닉네임 설정과
// 약관동의만 별도로 받는다. 이미 프로필이 있는 사용자가 다시 호출하면 거부한다.
export async function POST(request: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return apiError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const nickname: string | undefined = body.nickname?.trim();
  const terms: TermInput[] = Array.isArray(body.terms) ? body.terms : [];

  if (!nickname) {
    return apiError("닉네임을 입력해주세요.");
  }

  const nicknameError = validateNickname(nickname);
  if (nicknameError) {
    return apiError(nicknameError);
  }

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("T_USER_PROFILE")
    .select("USER_ID")
    .eq("USER_ID", user.id)
    .maybeSingle();

  if (existingProfile) {
    return apiError("이미 프로필이 있습니다.", 409);
  }

  let termsMaster;
  try {
    termsMaster = await loadTermsMaster(admin);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "약관 정보를 불러오지 못했습니다.", 500);
  }
  const missingRequired = findMissingRequiredTerms(termsMaster, terms);
  if (missingRequired.length > 0) {
    return apiError(`필수 약관에 동의해주세요: ${missingRequired.map((t) => t.TERM_CODE).join(", ")}`);
  }

  const { data: existingNickname } = await admin
    .from("T_USER_PROFILE")
    .select("USER_ID")
    .eq("NICKNAME", nickname)
    .maybeSingle();

  if (existingNickname) {
    return apiError("이미 사용 중인 닉네임입니다.");
  }

  const { error: profileError } = await admin.from("T_USER_PROFILE").insert({
    USER_ID: user.id,
    NICKNAME: nickname,
    PROFILE_IMAGE_URL: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
  });

  if (profileError) {
    const message = profileError.code === "23505" ? "이미 사용 중인 닉네임입니다." : profileError.message;
    return apiError(message, 409);
  }

  const agreementRows = buildAgreementRows(termsMaster, user.id, terms);
  if (agreementRows.length > 0) {
    const { error: agreementError } = await admin.from("T_USER_TERMS_AGREEMENT").insert(agreementRows);
    if (agreementError) {
      return apiError(`프로필은 생성됐지만 약관 동의 기록에 실패했습니다: ${agreementError.message}`, 500);
    }
  }

  return apiSuccess({ nickname }, "프로필이 완성되었습니다.");
}
