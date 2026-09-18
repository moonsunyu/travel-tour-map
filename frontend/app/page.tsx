"use client";

import { Compass, UserCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();

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
              <p className="text-sm text-slate-500 leading-relaxed">
                메인 페이지는 준비 중입니다. <br />
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-md px-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
              <UserCheck className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">반갑습니다, {user.nickname}님!</h1>
            </div>
            <div className="pt-2">
              <Link
                href="/mypage"
                className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                마이페이지 바로가기
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
