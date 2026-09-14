"use client";

import { AlertCircle, ArrowRight, Check, CheckCircle2, Lock, Mail, ShieldCheck, User as UserIcon, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { validateNickname, validatePassword } from "@/lib/authClient";
import { useAuth } from "@/context/AuthContext";
import { TermCode } from "@/lib/types";

interface Props {
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<Props> = ({ onSwitchToLogin }) => {
  const { signup, checkNicknameAvailability, openTermsDetail } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");

  const [nicknameChecked, setNicknameChecked] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState(false);
  const [nicknameCheckLoading, setNicknameCheckLoading] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState<string | null>(null);

  const [terms, setTerms] = useState<Record<TermCode, boolean>>({ TOS: false, PRIVACY: false, LBS: false });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupCompleted, setSignupCompleted] = useState<{ email: string; nickname: string } | null>(null);

  const passwordChecks = useMemo(
    () => ({
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^a-zA-Z0-9]/.test(password),
      minLen: password.length >= 8,
      matchesConfirm: password.length > 0 && password === passwordConfirm,
    }),
    [password, passwordConfirm],
  );

  const isPasswordValid =
    passwordChecks.hasLetter && passwordChecks.hasNumber && passwordChecks.hasSpecial && passwordChecks.minLen;

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

  const allTermsChecked = terms.TOS && terms.PRIVACY && terms.LBS;
  const handleToggleAllTerms = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setTerms({ TOS: checked, PRIVACY: checked, LBS: checked });
  };

  const handleToggleTerm = (code: TermCode) => {
    setTerms((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const pwdRes = validatePassword(password);
    if (!pwdRes.valid) {
      setErrorMessage(pwdRes.message!);
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (!terms.TOS) {
      setErrorMessage("필수 약관에 동의해주세요: TOS");
      return;
    }
    if (!terms.PRIVACY) {
      setErrorMessage("필수 약관에 동의해주세요: PRIVACY");
      return;
    }
    const nickRes = validateNickname(nickname);
    if (!nickRes.valid) {
      setErrorMessage(nickRes.message!);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signup({
        email: email.trim(),
        password,
        nickname: nickname.trim(),
        profileImageUrl: null,
        terms: [
          { code: "TOS", agreed: terms.TOS },
          { code: "PRIVACY", agreed: terms.PRIVACY },
          { code: "LBS", agreed: terms.LBS },
        ],
      });

      if (res.success) {
        setSignupCompleted({ email: email.trim(), nickname: nickname.trim() });
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage("회원가입 요청 중 네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (signupCompleted) {
    return (
      <div id="signup-success-view" className="text-center space-y-6 py-4 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-sky-50 border border-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Mail className="w-8 h-8 text-sky-600 animate-bounce" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            가입 접수 완료
          </span>
          <h3 className="text-xl font-bold text-slate-900">인증 이메일을 발송했습니다</h3>
          <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            <strong className="text-slate-800">{signupCompleted.email}</strong> 주소로 인증 링크가 담긴 메일을
            보냈습니다. 메일함에서 링크를 클릭하면 즉시 로그인이 가능합니다.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-left space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>안전한 혼여행 커뮤니티를 위한 이메일 인증 절차</span>
          </div>
          <p className="leading-relaxed">이메일 인증 완료 전에는 로그인이 차단됩니다. 메일함(스팸함 포함)을 확인해주세요.</p>
        </div>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
        >
          로그인 화면으로 이동
        </button>
      </div>
    );
  }

  return (
    <div id="signup-form-container" className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">홀로트립 회원가입</h2>
        <p className="text-sm text-slate-500">혼자라서 더 특별한 당신의 여행을 함께합니다</p>
      </div>

      {errorMessage && (
        <div
          id="signup-error-alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="font-medium leading-snug">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            이메일 주소 <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="signup-email-input"
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
          <label className="text-xs font-semibold text-slate-700 block">
            닉네임 <span className="text-rose-500">*</span>
            <span className="text-[11px] font-normal text-slate-400 ml-1.5">(한글/영문/숫자 2~20자)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-nickname-input"
                type="text"
                placeholder="나만의 혼여행 닉네임"
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
              id="nickname-check-btn"
              type="button"
              onClick={handleCheckNickname}
              disabled={nicknameCheckLoading || !nickname.trim()}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            비밀번호 <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="signup-password-input"
              type="password"
              placeholder="영문+숫자+특수문자 조합 8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <div
              className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border ${
                passwordChecks.minLen
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              {passwordChecks.minLen ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
              <span>8자 이상</span>
            </div>
            <div
              className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border ${
                passwordChecks.hasLetter
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              {passwordChecks.hasLetter ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
              <span>영문 포함</span>
            </div>
            <div
              className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border ${
                passwordChecks.hasNumber
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              {passwordChecks.hasNumber ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
              <span>숫자 포함</span>
            </div>
            <div
              className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border ${
                passwordChecks.hasSpecial
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              {passwordChecks.hasSpecial ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
              <span>특수문자 포함</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            비밀번호 확인 <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="signup-password-confirm-input"
              type="password"
              placeholder="비밀번호 다시 입력"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none transition-all"
            />
          </div>
          {passwordConfirm && (
            <p
              className={`text-xs flex items-center gap-1 mt-1 ${
                passwordChecks.matchesConfirm ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {passwordChecks.matchesConfirm ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>비밀번호가 일치합니다.</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>비밀번호가 일치하지 않습니다.</span>
                </>
              )}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 cursor-pointer transition-colors">
            <input
              id="terms-all-checkbox"
              type="checkbox"
              checked={allTermsChecked}
              onChange={handleToggleAllTerms}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-900">모든 약관에 동의합니다</span>
          </label>

          <div className="space-y-1.5 pl-1 pr-1">
            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
                <input
                  id="terms-tos-checkbox"
                  type="checkbox"
                  checked={terms.TOS}
                  onChange={() => handleToggleTerm("TOS")}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
                <span>
                  <strong className="text-rose-600 font-semibold mr-1">[필수]</strong>
                  홀로트립 서비스 이용약관 동의
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

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
                <input
                  id="terms-privacy-checkbox"
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

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
                <input
                  id="terms-lbs-checkbox"
                  type="checkbox"
                  checked={terms.LBS}
                  onChange={() => handleToggleTerm("LBS")}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
                <span>
                  <strong className="text-slate-400 font-medium mr-1">[선택]</strong>
                  위치기반 서비스 이용약관 (주변 1인 식당/명소 추천)
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
        </div>

        <button
          id="signup-submit-btn"
          type="submit"
          disabled={isSubmitting || !isPasswordValid || !passwordChecks.matchesConfirm}
          className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>동의하고 회원가입</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-2 text-center text-sm text-slate-500">
        이미 계정이 있으신가요?{" "}
        <button
          id="switch-to-login-btn"
          type="button"
          onClick={onSwitchToLogin}
          className="text-sky-600 font-semibold hover:text-sky-700 underline underline-offset-2 ml-1 cursor-pointer"
        >
          로그인하기
        </button>
      </div>
    </div>
  );
};
