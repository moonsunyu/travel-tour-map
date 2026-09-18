"use client";

import { AlertCircle, Check, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { authClient, validatePassword } from "@/lib/authClient";

// 비밀번호 재설정 이메일의 링크를 클릭하면 /auth/callback을 거쳐 도착하는 페이지.
// 그 시점엔 이미 recovery 세션이 쿠키에 설정돼 있어야 하고, 그 상태에서만 아래 요청이 성공한다.
export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const pwdCheck = validatePassword(newPassword);
    if (!pwdCheck.valid) {
      setErrorMessage(pwdCheck.message!);
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setErrorMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authClient.resetPasswordConfirm({ password: newPassword });
      if (res.success) {
        setConfirmSuccess(true);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage("비밀번호 재설정 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 sm:py-24">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-8">
        {confirmSuccess ? (
          <div id="reset-success-view" className="text-center space-y-5 py-4 animate-in fade-in duration-300">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900">비밀번호 재설정 완료</h3>
              <p className="text-sm text-slate-600">비밀번호가 성공적으로 변경되었습니다.</p>
            </div>
            <Link
              href="/"
              className="block w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer"
            >
              홈으로 이동
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">새 비밀번호 설정</h2>
              <p className="text-sm text-slate-500">홀로트립에서 사용할 새로운 비밀번호를 입력해주세요</p>
            </div>

            {errorMessage && (
              <div
                id="reset-confirm-error-alert"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="font-medium leading-snug">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  새 비밀번호 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reset-new-password-input"
                    type="password"
                    placeholder="영문+숫자+특수문자 조합 8자 이상"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  새 비밀번호 확인 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reset-new-password-confirm-input"
                    type="password"
                    placeholder="비밀번호 다시 입력"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none transition-all"
                  />
                </div>
              </div>

              <button
                id="reset-confirm-submit-btn"
                type="submit"
                disabled={isSubmitting || !newPassword || newPassword !== newPasswordConfirm}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>비밀번호 변경 완료</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
