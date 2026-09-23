// 2~20자, 한글/영문/숫자만 허용(공백·특수문자 금지).
// (docs/plans/2026-09-14-user-profile-account-api.md §6-2 가정)
const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,20}$/;

export function validateNickname(nickname: string): string | null {
  if (!NICKNAME_PATTERN.test(nickname)) {
    return "닉네임은 한글/영문/숫자만 사용해 2~20자로 입력해주세요.";
  }
  return null;
}
