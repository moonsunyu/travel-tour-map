"use client";

import { AlertCircle, ArrowRight, Check, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { validateNickname } from "@/lib/authClient";
import { useAuth } from "@/context/AuthContext";
import { TermCode } from "@/lib/types";

export const SocialCompleteForm: React.FC = () => {
  const { completeSocialSignup, checkNicknameAvailability, openTermsDetail } = useAuth();

  const [nickname, setNickname] = useState("");
  const [nicknameChecked, setNicknameChecked] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState(false);
  const [nicknameCheckLoading, setNicknameCheckLoading] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState<string | null>(null);

  const [terms, setTerms] = useState<Record<TermCode, boolean>>({ TOS: false, PRIVACY: false, LBS: false });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckNickname = async () => {
    if (!nickname.trim()) {
      setNicknameMessage("닉네임을 입력해주세요.");
      setNicknameChecked(false);
      return;
    }

    const formatCheck = validateNickname(nickname.trim());
    if (!formatCheck.valid) {
      setNicknameMessage(formatCheck.message || "닉네임 형식이 올바르지 않습니다.");
      setNicknameAvailable(false);
      setNicknameChecked(true);
      return;
    }

    setNicknameCheckLoading(true);
    setNicknameMessage(null);
    try {
      const res = await checkNicknameAvailability(nickname.trim());
      setNicknameChecked(true);
      setNicknameAvailable(res.available);
      setNicknameMessage(res.message);
    } catch {
      setNicknameMessage("중복 확인 중 오류가 발생했습니다.");
      setNicknameAvailable(false);
      setNicknameChecked(true);
    } finally {
      setNicknameCheckLoading(false);
    }
  };

  const handleToggleTerm = (code: TermCode) => {
    setTerms((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!terms.TOS) {
      setErrorMessage("필수 약관에 동의해주세요: TOS");
      return;
    }
    if (!terms.PRIVACY) {
      setErrorMessage("필수 약관에 동의해주세요: PRIVACY");
      return;
    }
    const nickCheck = validateNickname(nickname);
    if (!nickCheck.valid) {
      setErrorMessage(nickCheck.message!);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await completeSocialSignup({
        nickname: nickname.trim(),
        terms: [
          { code: "TOS", agreed: terms.TOS },
          { code: "PRIVACY", agreed: terms.PRIVACY },
          { code: "LBS", agreed: terms.LBS },
        ],
      });

      if (!res.success) {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage("프로필 등록 중 네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="social-complete-container" className="space-y-5">
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">혼여행 프로필 완성</h2>
        <p className="text-sm text-slate-500">닉네임을 설정하고 필수 약관에 동의해주세요</p>
      </div>

      {errorMessage && (
        <div
          id="social-complete-error"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="font-medium leading-snug">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            혼여행 닉네임 <span className="text-rose-500">*</span>
            <span className="text-[11px] font-normal text-slate-400 ml-1.5">(한글/영문/숫자 2~20자)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="social-nickname-input"
                type="text"
                placeholder="예: 자유로운나그네"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setNicknameChecked(false);
                  setNicknameMessage(null);
                }}
                required
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none transition-all"
              />
            </div>
            <button
              id="social-nickname-check-btn"
              type="button"
              onClick={handleCheckNickname}
              disabled={nicknameCheckLoading || !nickname.trim()}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              {nicknameCheckLoading ? "확인 중..." : "중복확인"}
            </button>
          </div>
          {nicknameMessage && (
            <p
              className={`text-xs flex items-center gap-1 mt-1 ${
                nicknameChecked && nicknameAvailable ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {nicknameChecked && nicknameAvailable ? (
                <Check className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{nicknameMessage}</span>
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2">
          <span className="text-xs font-semibold text-slate-700 block">약관 동의</span>

          <div className="flex items-center justify-between py-1 px-1">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
              <input
                id="social-terms-tos"
                type="checkbox"
                checked={terms.TOS}
                onChange={() => handleToggleTerm("TOS")}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span>
                <strong className="text-rose-600 font-semibold mr-1">[필수]</strong>
                서비스 이용약관 동의
              </span>
            </label>
            <button
              type="button"
              onClick={() => openTermsDetail("TOS")}
              className="text-[11px] text-slate-400 hover:text-sky-600 underline cursor-pointer"
            >
              전문보기
            </button>
          </div>

          <div className="flex items-center justify-between py-1 px-1">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
              <input
                id="social-terms-privacy"
                type="checkbox"
                checked={terms.PRIVACY}
                onChange={() => handleToggleTerm("PRIVACY")}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span>
                <strong className="text-rose-600 font-semibold mr-1">[필수]</strong>
                개인정보 수집 및 이용 동의
              </span>
            </label>
            <button
              type="button"
              onClick={() => openTermsDetail("PRIVACY")}
              className="text-[11px] text-slate-400 hover:text-sky-600 underline cursor-pointer"
            >
              전문보기
            </button>
          </div>

          <div className="flex items-center justify-between py-1 px-1">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
              <input
                id="social-terms-lbs"
                type="checkbox"
                checked={terms.LBS}
                onChange={() => handleToggleTerm("LBS")}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span>
                <strong className="text-slate-400 font-medium mr-1">[선택]</strong>
                위치기반 서비스 이용약관 (1인 맛집/스팟 추천)
              </span>
            </label>
            <button
              type="button"
              onClick={() => openTermsDetail("LBS")}
              className="text-[11px] text-slate-400 hover:text-sky-600 underline cursor-pointer"
            >
              전문보기
            </button>
          </div>
        </div>

        <button
          id="social-complete-submit-btn"
          type="submit"
          disabled={isSubmitting || !terms.TOS || !terms.PRIVACY || !nickname.trim()}
          className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>혼여행 시작하기</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
