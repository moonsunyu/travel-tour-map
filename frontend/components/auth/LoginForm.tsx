"use client";

import { AlertCircle, ArrowRight, Lock, Mail, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface Props {
  onSwitchToSignup: () => void;
  onSwitchToReset: () => void;
}

export const LoginForm: React.FC<Props> = ({ onSwitchToSignup, onSwitchToReset }) => {
  const { login, startGoogleLogin, loginErrorFromRedirect, clearLoginErrorFromRedirect } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);

  // /auth/callback(구글 로그인 등)이 실패해서 돌아온 경우 에러를 보여준다.
  // 로컬 state로 옮겨담지 않고 그대로 표시한 뒤, 한 번 보여준 값은 컨텍스트에서 비운다.
  const displayedError = errorMessage ?? loginErrorFromRedirect;
  useEffect(() => {
    return () => {
      if (loginErrorFromRedirect) clearLoginErrorFromRedirect();
    };
  }, [loginErrorFromRedirect, clearLoginErrorFromRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setEmailNotConfirmed(false);

    if (!email.trim() || !password) {
      setErrorMessage("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({ email: email.trim(), password });
      if (!res.success) {
        if (res.message === "Email not confirmed") {
          setEmailNotConfirmed(true);
          setErrorMessage("이메일 인증이 완료되지 않았습니다. 메일함의 링크를 확인해주세요.");
        } else {
          setErrorMessage(res.message);
        }
      }
    } catch {
      setErrorMessage("로그인 중 네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-form-container" className="space-y-5">
      <div className="text-center space-y-1.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" /> 오롯이 나에게 집중하는 혼여행
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">홀로트립 로그인</h2>
        <p className="text-sm text-slate-500">나만의 안심 혼여행 공간으로 들어가세요</p>
      </div>

      <button
        id="google-login-btn"
        type="button"
        onClick={startGoogleLogin}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 hover:border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all shadow-xs cursor-pointer group"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Google 계정으로 계속하기</span>
      </button>

      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-slate-200 w-full"></div>
        <span className="bg-white px-3 text-xs text-slate-400 font-medium absolute uppercase tracking-wider">
          또는 이메일로 로그인
        </span>
      </div>

      {displayedError && (
        <div
          id="login-error-alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <p className="font-medium leading-snug">{displayedError}</p>
            {emailNotConfirmed && (
              <p className="text-xs text-rose-600 bg-white/70 p-2 rounded-lg border border-rose-100">
                가입 시 입력하신 이메일 주소로 발송된 인증 메일의 링크를 클릭하면 즉시 로그인할 수 있습니다.
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">이메일</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="login-email-input"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">비밀번호</label>
            <button
              id="forgot-password-link"
              type="button"
              onClick={onSwitchToReset}
              className="text-xs text-sky-600 hover:text-sky-700 font-medium cursor-pointer"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="login-password-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none transition-all"
            />
          </div>
        </div>

        <button
          id="login-submit-btn"
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>로그인</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-2 text-center text-sm text-slate-500">
        아직 홀로트립 회원이 아니신가요?{" "}
        <button
          id="switch-to-signup-btn"
          type="button"
          onClick={onSwitchToSignup}
          className="text-sky-600 font-semibold hover:text-sky-700 underline underline-offset-2 ml-1 cursor-pointer"
        >
          회원가입하기
        </button>
      </div>
    </div>
  );
};
