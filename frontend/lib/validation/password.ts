// 영문 1자 이상 + 숫자 1자 이상 + 특수문자 1자 이상 + 총 8자 이상.
// (docs/plans/2026-09-14-user-profile-account-api.md §6-3 가정)
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function validatePassword(password: string): string | null {
  if (!PASSWORD_PATTERN.test(password)) {
    return "비밀번호는 영문, 숫자, 특수문자를 모두 포함해 8자 이상이어야 합니다.";
  }
  return null;
}
