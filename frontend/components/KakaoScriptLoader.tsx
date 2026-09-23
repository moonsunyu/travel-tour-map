// components/KakaoScriptLoader.tsx
"use client";

import { useEffect } from "react";

export function KakaoScriptLoader() {
  useEffect(() => {
    if (document.getElementById("kakao-sdk")) return;

    const script = document.createElement("script");
    script.id = "kakao-sdk";
    // autoload=false 명시해야 함!!
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=clusterer,services&autoload=false`;
    script.async = false;

    script.onload = () => {
      window.kakao?.maps.load(() => {
        // 모듈 로드 완료
      });
    };

    document.head.appendChild(script);
  }, []);

  return null;
}