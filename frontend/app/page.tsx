"use client";

import { UserCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import KakaoMap from "@/components/KakaoMap";

export default function Home() {
  const { user, isLoading } = useAuth();

  return (
    <>
      {/* 배경: 지도가 화면 전체를 채움 */}
      <KakaoMap />

      {/* 로그인 상태일 때만 환영 카드 표시. 로그인 전에는 지도만 보임 */}
      {/* {!isLoading && user && (
        <main className="fixed inset-0 z-30 flex items-start justify-center pt-24 px-4 pointer-events-none">
          <div className="max-w-md w-full pointer-events-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
                <UserCheck className="w-8 h-8" />
              </div> */}
      {/* <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                  반갑습니다, {user.nickname}님!
                </h1>
              </div>
              <div className="pt-2">
                <Link
                  href="/mypage"
                  className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  마이페이지 바로가기
                </Link>
              </div> */}
      {/* </div>
          </div>
        </main> */}
      {/* )} */}
    </>
  );
}