export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message: string;
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
