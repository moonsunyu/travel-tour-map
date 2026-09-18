"use client";

import { useAuth } from "@/context/AuthContext";

export const Footer: React.FC = () => {
  const { openTermsDetail } = useAuth();

  return (
    <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-xs text-slate-400 max-w-sm">© 2026 HoloTrip Korea. 모든 권리 보유. 안심 혼여행 프로젝트.</p>

          <div className="flex items-center gap-4 text-xs">
            <button onClick={() => openTermsDetail("TOS")} className="hover:text-white transition-colors cursor-pointer">
              이용약관
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => openTermsDetail("PRIVACY")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              개인정보처리방침
            </button>
            <span className="text-slate-700">|</span>
            <button onClick={() => openTermsDetail("LBS")} className="hover:text-white transition-colors cursor-pointer">
              위치기반서비스이용약관
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
