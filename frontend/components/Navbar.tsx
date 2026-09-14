"use client";

import { Compass, LogIn, LogOut, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_PROFILE_IMAGE } from "@/lib/authClient";

export const Navbar: React.FC = () => {
  const { user, openAuthModal, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isMyPage = pathname === "/mypage";

  const avatarUrl = user?.profileImageUrl || DEFAULT_PROFILE_IMAGE;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link id="navbar-logo" href="/" className="flex items-center gap-2.5 cursor-pointer text-left group">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-sky-500 to-teal-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors">
                홀로트립
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-sky-100 text-sky-700">혼여행</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">나를 만나는 혼자만의 여정</p>
          </div>
        </Link>

        {/* Right Auth Section: 로그인, 회원가입 버튼 */}
        <div className="flex items-center gap-2">
          {!user ? (
            <div className="flex items-center gap-2">
              <button
                id="nav-login-btn"
                onClick={() => openAuthModal("login")}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4 text-slate-500" />
                <span>로그인</span>
              </button>
              <button
                id="nav-signup-btn"
                onClick={() => openAuthModal("signup")}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>회원가입</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              {/* User Avatar & Nickname Pill */}
              <Link
                id="nav-mypage-btn"
                href="/mypage"
                className={`flex items-center gap-2.5 p-1 pl-2 pr-3 rounded-full border transition-all cursor-pointer group ${
                  isMyPage ? "bg-sky-50 border-sky-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                }`}
                title="마이페이지"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl}
                    alt={user.nickname}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_PROFILE_IMAGE;
                    }}
                  />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-sky-600 transition-colors block leading-tight">
                    {user.nickname}
                  </span>
                  <span className="text-[10px] text-sky-600 font-semibold block leading-none">마이페이지</span>
                </div>
              </Link>

              <button
                id="nav-logout-btn"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
