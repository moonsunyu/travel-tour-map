"use client";

import { FileText, MapPin, ShieldCheck, X } from "lucide-react";
import { TERMS_DEFINITIONS } from "@/lib/termsText";
import { TermCode } from "@/lib/types";

interface Props {
  code: TermCode | null;
  onClose: () => void;
}

export const TermsDetailModal: React.FC<Props> = ({ code, onClose }) => {
  if (!code) return null;
  const term = TERMS_DEFINITIONS[code];
  if (!term) return null;

  const getIcon = () => {
    switch (code) {
      case "TOS":
        return <FileText className="w-5 h-5 text-sky-600" />;
      case "PRIVACY":
        return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case "LBS":
        return <MapPin className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div
      id="terms-detail-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="terms-detail-card"
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            {getIcon()}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">{term.title}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    term.required
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {term.required ? "필수" : "선택"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{term.summary}</p>
            </div>
          </div>
          <button
            id="terms-close-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed text-slate-600 font-normal whitespace-pre-line bg-white">
          {term.fullText}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            id="terms-confirm-btn"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
