"use client";

import { Compass, UserCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, isLoading, openAuthModal } = useAuth();

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 flex flex-col justify-center">
      <div className="py-20 sm:py-28 flex flex-col items-center justify-center text-center">
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin" />
        ) : !user ? (
          <div className="space-y-4 max-w-md px-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-xs">
              <Compass className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">홀로트립 (HoloTrip)</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                메인 페이지는 준비 중입니다. <br />
                우측 상단의 <strong className="text-slate-800 font-semibold">로그인</strong> 및{" "}
                <strong className="text-sky-600 font-semibold">회원가입</strong> 버튼을 통해 인증 기능을 이용하실 수
                있습니다.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => openAuthModal("login")}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                로그인 창 열기
              </button>
              <button
                onClick={() => openAuthModal("signup")}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                회원가입 시작하기
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-md px-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
              <UserCheck className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">반갑습니다, {user.nickname}님!</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                로그인이 완료되었습니다. 우측 상단의 프로필 또는 아래 버튼을 통해 마이페이지와 계정 설정을 확인하실
                수 있습니다.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/mypage"
                className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                마이페이지 (계정 및 보안 설정) 바로가기
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
