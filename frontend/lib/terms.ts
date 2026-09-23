import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;
type TermInput = { code: string; agreed: boolean };

// 회원가입(이메일/구글 공통)에서 재사용하는 약관 처리 로직.
export async function loadTermsMaster(admin: AdminClient) {
  const { data, error } = await admin.from("T_TERMS").select("TERM_CODE, IS_REQUIRED, VERSION");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export function findMissingRequiredTerms(
  termsMaster: { TERM_CODE: string; IS_REQUIRED: boolean }[],
  terms: TermInput[],
) {
  const agreedCodes = new Set(terms.filter((t) => t.agreed).map((t) => t.code));
  return termsMaster.filter((t) => t.IS_REQUIRED && !agreedCodes.has(t.TERM_CODE));
}

export function buildAgreementRows(
  termsMaster: { TERM_CODE: string; VERSION: string }[],
  userId: string,
  terms: TermInput[],
) {
  const versionByCode = new Map(termsMaster.map((t) => [t.TERM_CODE, t.VERSION]));
  return terms
    .filter((t) => versionByCode.has(t.code))
    .map((t) => ({
      USER_ID: userId,
      TERM_CODE: t.code,
      AGREED: t.agreed,
      AGREED_VERSION: versionByCode.get(t.code),
    }));
}
