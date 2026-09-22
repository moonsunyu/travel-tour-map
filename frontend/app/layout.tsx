import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AuthModal } from "@/components/auth/AuthModal";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { SearchSidebar } from "@/components/search/SearchSidebar";
import { AuthProvider } from "@/context/AuthContext";
import { SearchSidebarProvider } from "@/context/SearchSidebarContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "홀로트립 - 혼여행 플랫폼",
  description: "혼자 떠나는 여행자를 위한 안심 혼여행 가이드 및 회원·인증 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" />
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?...`}
        strategy="beforeInteractive"
      />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-[#1E293B]">
        <AuthProvider>
          <SearchSidebarProvider>
            <Navbar />
            <div className="flex-1 flex flex-col">{children}</div>
            <AuthModal />
            <SearchSidebar />
            <Footer />
          </SearchSidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
