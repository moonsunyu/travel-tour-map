import {
  ApiResult,
  CompleteSocialSignupRequest,
  LoginRequest,
  NicknameCheckData,
  PasswordChangeRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  ProfileData,
  ProfileImageUploadResponse,
  ProfileStatusData,
  SignupRequest,
  SignupResponseData,
} from "@/lib/types";

export const DEFAULT_PROFILE_IMAGE =
  "https://hkndfhdihzchiqxnidat.supabase.co/storage/v1/object/public/profile-images/default.svg";

// 세션은 httpOnly 쿠키로 관리되므로 별도 토큰을 안 실어보내도 동일 출처 요청엔 자동으로 실린다.
// status를 함께 반환해서, 같은 실패라도 401(로그인 필요)과 404(프로필 없음) 등을 화면에서 구분할 수 있게 한다.
async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const isFormData = options.body instanceof FormData;
    const res = await fetch(path, {
      ...options,
      headers: isFormData ? options.headers : { "Content-Type": "application/json", ...options.headers },
    });
    const json = await res.json();
    return { ...json, status: res.status } as ApiResult<T>;
  } catch {
    return {
      success: false,
      data: null,
      message: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      status: 0,
    };
  }
}

// 영문+숫자+특수문자 조합 8자 이상 (서버와 동일 규칙 — 사용자 입력 즉시 피드백용)
export function validatePassword(password: string): { valid: boolean; message?: string } {
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isMinLength = password.length >= 8;

  if (!hasLetter || !hasNumber || !hasSpecial || !isMinLength) {
    return { valid: false, message: "비밀번호는 영문, 숫자, 특수문자를 모두 포함해 8자 이상이어야 합니다." };
  }
  return { valid: true };
}

// 한글/영문/숫자 2~20자 (서버와 동일 규칙)
export function validateNickname(nickname: string): { valid: boolean; message?: string } {
  const nicknameRegex = /^[a-zA-Z0-9가-힣]{2,20}$/;
  if (!nicknameRegex.test(nickname)) {
    return { valid: false, message: "닉네임은 한글/영문/숫자만 사용해 2~20자로 입력해주세요." };
  }
  return { valid: true };
}

class AuthClient {
  signup(payload: SignupRequest) {
    return request<SignupResponseData>("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) });
  }

  login(payload: LoginRequest) {
    return request<{ user: { id: string; email: string } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  logout() {
    return request<null>("/api/auth/logout", { method: "POST" });
  }

  // 구글 로그인은 async 응답이 아니라 브라우저 풀페이지 이동이라 여기선 URL만 내려준다.
  getGoogleLoginUrl() {
    return "/api/auth/google";
  }

  getProfile() {
    return request<ProfileData>("/api/profile");
  }

  getProfileStatus() {
    return request<ProfileStatusData>("/api/profile/me/status");
  }

  completeSocialSignup(payload: CompleteSocialSignupRequest) {
    return request<{ nickname: string }>("/api/profile/complete-social-signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  updateNickname(nickname: string) {
    return request<{ nickname: string }>("/api/profile", { method: "PATCH", body: JSON.stringify({ nickname }) });
  }

  checkNickname(nickname: string) {
    return request<NicknameCheckData>(`/api/profile/nickname-check?nickname=${encodeURIComponent(nickname)}`);
  }

  uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return request<ProfileImageUploadResponse>("/api/profile/image", { method: "POST", body: formData });
  }

  changePassword(payload: PasswordChangeRequest) {
    return request<null>("/api/profile/password", { method: "PUT", body: JSON.stringify(payload) });
  }

  deleteAccount() {
    return request<null>("/api/account", { method: "DELETE" });
  }

  resetPasswordRequest(payload: PasswordResetRequest) {
    return request<null>("/api/auth/password/reset-request", { method: "POST", body: JSON.stringify(payload) });
  }

  resetPasswordConfirm(payload: PasswordResetConfirmRequest) {
    return request<null>("/api/auth/password/reset-confirm", { method: "POST", body: JSON.stringify(payload) });
  }
}

export const authClient = new AuthClient();
