"use client";

import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LoginForm } from "./LoginForm";
import { PasswordResetForm } from "./PasswordResetForm";
import { SignupForm } from "./SignupForm";
import { SocialCompleteForm } from "./SocialCompleteForm";
import { TermsDetailModal } from "./TermsDetailModal";

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, closeAuthModal, openAuthModal, termsDetailCode, closeTermsDetail } = useAuth();

  if (!isAuthModalOpen) {
    return <TermsDetailModal code={termsDetailCode} onClose={closeTermsDetail} />;
  }

  return (
    <>
      <div
        id="auth-modal-backdrop"
        className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={closeAuthModal}
      >
        <div
          id="auth-modal-card"
          className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden relative max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            id="auth-modal-close-btn"
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 md:p-8 overflow-y-auto">
            {authModalMode === "login" && (
              <LoginForm onSwitchToSignup={() => openAuthModal("signup")} onSwitchToReset={() => openAuthModal("reset-request")} />
            )}

            {authModalMode === "signup" && <SignupForm onSwitchToLogin={() => openAuthModal("login")} />}

            {authModalMode === "social-complete" && <SocialCompleteForm />}

            {authModalMode === "reset-request" && <PasswordResetForm onBackToLogin={() => openAuthModal("login")} />}
          </div>
        </div>
      </div>

      <TermsDetailModal code={termsDetailCode} onClose={closeTermsDetail} />
    </>
  );
};
