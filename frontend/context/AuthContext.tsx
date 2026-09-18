"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/authClient";
import {
  CompleteSocialSignupRequest,
  LoginRequest,
  PasswordChangeRequest,
  ProfileData,
  SignupRequest,
  TermCode,
} from "@/lib/types";

export type AuthModalMode = "login" | "signup" | "reset-request" | "social-complete";

interface AuthContextType {
  user: ProfileData | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  termsDetailCode: TermCode | null;
  loginErrorFromRedirect: string | null;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  openTermsDetail: (code: TermCode) => void;
  closeTermsDetail: () => void;
  clearLoginErrorFromRedirect: () => void;
  login: (payload: LoginRequest) => Promise<{ success: boolean; message: string }>;
  signup: (payload: SignupRequest) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  startGoogleLogin: () => void;
  completeSocialSignup: (payload: CompleteSocialSignupRequest) => Promise<{ success: boolean; message: string }>;
  updateNickname: (nickname: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (payload: PasswordChangeRequest) => Promise<{ success: boolean; message: string }>;
  uploadProfileImage: (file: File) => Promise<{ success: boolean; message: string; url?: string }>;
  deleteAccount: () => Promise<{ success: boolean; message: string }>;
  checkNicknameAvailability: (nickname: string) => Promise<{ available: boolean; message: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("login");
  const [termsDetailCode, setTermsDetailCode] = useState<TermCode | null>(null);
  const [loginErrorFromRedirect, setLoginErrorFromRedirect] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const res = await authClient.getProfile();
    if (res.success && res.data) {
      setUser(res.data);
      return;
    }

    setUser(null);
    // 로그인은 됐지만 프로필이 없는 경우(구글 최초 로그인 직후) -> 프로필 완성 모달을 띄운다.
    if (res.status === 404) {
      setAuthModalMode("social-complete");
      setIsAuthModalOpen(true);
    }
  }, []);

  // 최초 로드: 로그인 상태 판별 + /auth/callback이 실패했을 때 붙여주는 ?auth_error= 처리
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      const params = new URLSearchParams(window.location.search);
      const authError = params.get("auth_error");
      if (authError) {
        setLoginErrorFromRedirect(authError);
        setAuthModalMode("login");
        setIsAuthModalOpen(true);
        params.delete("auth_error");
        const nextSearch = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (nextSearch ? `?${nextSearch}` : ""));
      }

      await refreshProfile();
      setIsLoading(false);
    };
    init();
  }, [refreshProfile]);

  const openAuthModal = (mode: AuthModalMode = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openTermsDetail = (code: TermCode) => setTermsDetailCode(code);
  const closeTermsDetail = () => setTermsDetailCode(null);
  const clearLoginErrorFromRedirect = () => setLoginErrorFromRedirect(null);

  const login = async (payload: LoginRequest) => {
    const res = await authClient.login(payload);
    if (res.success) {
      await refreshProfile();
      closeAuthModal();
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message };
  };

  const signup = async (payload: SignupRequest) => {
    const res = await authClient.signup(payload);
    return { success: res.success, message: res.message };
  };

  const logout = async () => {
    await authClient.logout();
    setUser(null);
  };

  // 구글 로그인은 실제로는 풀페이지 리다이렉트다 — /auth/callback을 거쳐 돌아오면
  // 위 초기 로드 로직(refreshProfile)이 다시 실행되며 프로필 유무를 판별한다.
  const startGoogleLogin = () => {
    window.location.href = authClient.getGoogleLoginUrl();
  };

  const completeSocialSignup = async (payload: CompleteSocialSignupRequest) => {
    const res = await authClient.completeSocialSignup(payload);
    if (res.success) {
      await refreshProfile();
      closeAuthModal();
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message };
  };

  const updateNickname = async (nickname: string) => {
    const res = await authClient.updateNickname(nickname);
    if (res.success) {
      setUser((prev) => (prev ? { ...prev, nickname } : null));
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message };
  };

  const changePassword = async (payload: PasswordChangeRequest) => {
    const res = await authClient.changePassword(payload);
    return { success: res.success, message: res.message };
  };

  const uploadProfileImage = async (file: File) => {
    const res = await authClient.uploadProfileImage(file);
    if (res.success && res.data) {
      setUser((prev) => (prev ? { ...prev, profileImageUrl: res.data!.profileImageUrl } : null));
      return { success: true, message: res.message, url: res.data.profileImageUrl };
    }
    return { success: false, message: res.message };
  };

  const deleteAccount = async () => {
    const res = await authClient.deleteAccount();
    if (res.success) {
      setUser(null);
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message };
  };

  const checkNicknameAvailability = async (nickname: string) => {
    const res = await authClient.checkNickname(nickname);
    return { available: Boolean(res.data?.available), message: res.message };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        termsDetailCode,
        loginErrorFromRedirect,
        openAuthModal,
        closeAuthModal,
        openTermsDetail,
        closeTermsDetail,
        clearLoginErrorFromRedirect,
        login,
        signup,
        logout,
        startGoogleLogin,
        completeSocialSignup,
        updateNickname,
        changePassword,
        uploadProfileImage,
        deleteAccount,
        checkNicknameAvailability,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
