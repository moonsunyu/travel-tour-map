"use client";

import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/authClient";

interface Props {
  onBackToLogin: () => void;
}

// 새 비밀번호 입력(confirm) 단계는 여기 없다 — 실제로는 이메일 링크를 타고
// 완전히 새로 페이지가 로드되며 /reset-password에 도착하기 때문에 별도 페이지로 분리돼 있다.
export const PasswordResetForm: React.FC<Props> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage("이메일을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authClient.resetPasswordRequest({ email: email.trim() });
      if (res.success) {
        setRequestSent(true);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage("요청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="password-reset-container" className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>로그인으로 돌아가기</span>
        </button>
      </div>

      <div className="text-center space-y-1">
        <div className="w-10 h-10 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-2">
          <KeyRound className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">비밀번호 재설정</h2>
        <p className="text-sm text-slate-500">가입하신 이메일을 입력하시면 재설정 링크를 보내드립니다</p>
      </div>

      {errorMessage && (
        <div
          id="reset-error-alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="font-medium leading-snug">{errorMessage}</p>
        </div>
      )}

      {requestSent ? (
        <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 text-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-sky-900">
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
            <span>재설정 메일 발송 완료</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            가입된 계정인 경우 메일함(스팸함 포함)으로 재설정 링크가 도착합니다. 링크를 클릭하면 새 비밀번호를 설정할
            수 있는 화면으로 이동합니다.
          </p>
        </div>
      ) : (
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">가입 이메일 주소</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="reset-email-input"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none transition-all"
              />
            </div>
          </div>

          <button
            id="reset-request-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>재설정 링크 받기</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
