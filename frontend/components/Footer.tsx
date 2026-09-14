"use client";

import { Compass, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Footer: React.FC = () => {
  const { openTermsDetail } = useAuth();

  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">홀로트립 (HoloTrip)</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm">
              혼자 떠나는 여행자를 위한 안심 1인 스팟, 혼밥 친화 지도, 혼행 커뮤니티 플랫폼.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button onClick={() => openTermsDetail("TOS")} className="hover:text-white transition-colors cursor-pointer">
              이용약관
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => openTermsDetail("PRIVACY")}
              className="text-slate-300 font-semibold hover:text-white transition-colors cursor-pointer"
            >
              개인정보처리방침
            </button>
            <span className="text-slate-700">|</span>
            <button onClick={() => openTermsDetail("LBS")} className="hover:text-white transition-colors cursor-pointer">
              위치기반서비스이용약관
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 gap-3">
          <p>© 2026 HoloTrip Korea. 모든 권리 보유. 혼여행 안심 여행 프로젝트.</p>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>안심 인증 및 개인정보 보호 규정 준수</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
