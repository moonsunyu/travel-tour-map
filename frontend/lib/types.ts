export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message: string;
}

// authClient가 실제 fetch의 HTTP 상태코드까지 얹어 반환하는 형태.
// 200/401/404처럼 같은 실패라도 상태코드로 분기해야 하는 화면 로직(초기 로그인 판별 등)에 쓴다.
export interface ApiResult<T = unknown> extends ApiResponse<T> {
  status: number;
}

export type TermCode = "TOS" | "PRIVACY" | "LBS";

export interface TermAgreement {
  code: TermCode;
  agreed: boolean;
}

export interface User {
  id: string;
  email: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
  profileImageUrl?: string | null;
  terms: TermAgreement[];
}

export interface SignupResponseData {
  user: User;
  nickname: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ProfileData {
  email: string;
  nickname: string;
  profileImageUrl: string | null;
}

export interface NicknameCheckData {
  available: boolean;
}

export interface ProfileStatusData {
  hasProfile: boolean;
}

export interface CompleteSocialSignupRequest {
  nickname: string;
  terms: TermAgreement[];
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  password: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileImageUploadResponse {
  profileImageUrl: string;
}

export interface BookmarkItem {
  spotId: string;
  spotName: string;
  category: string | null;
  region: string;
}

export interface AddBookmarkRequest {
  spotId: string;
  spotName: string;
  category: string;
  region: string;
}

export { };

declare global {
  interface Window {
    kakao: any;
  }
}