// components/KakaoMap.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchSidebar } from "@/context/SearchSidebarContext";
import { DbPlace, PlaceCategory, PlaceRegion, fetchRegionTotals } from "@/lib/places";
import { reverseGeocode } from "@/lib/kakaoGeocode";
import MapControls from "@/components/MapControls";
import BookmarkPanel from "@/components/BookmarkPanel";
import { useBookmark } from "@/context/BookmarkContext";
import { Loader2, LocateFixed, RefreshCw, Undo2 } from "lucide-react";

const REGION_CENTER: Record<PlaceRegion, { lat: number; lng: number }> = {
  강원도: { lat: 37.8228, lng: 128.1555 },
  여수: { lat: 34.7604, lng: 127.6622 },
};

const REGION_OVERVIEW_COLOR: Record<PlaceRegion, string> = {
  강원도: "#4F46E5",
  여수: "#0D9488",
};

const PENINSULA_CENTER = { lat: 36.3, lng: 127.8 };
const PENINSULA_LEVEL = 13;
const REGION_LEVEL = 9;
const SELECTED_PLACE_LEVEL = 2;
const PROGRAMMATIC_MOVE_GUARD_MS = 700;

// 사이드바(w-96=384px)와 상세카드(w-72=288px) 폭 — 균등 배치 계산에 사용
const SIDEBAR_WIDTH_PX = 384;
const CARD_WIDTH_PX = 288;
const CARD_GAP_PX = 14;
const MARKER_ICON_HALF_PX = 18;

// 사이드바 배경(z-40)보다 높게 잡아서, 선택된 마커+카드만 어두운 막 위로 튀어나오게
const HIGHLIGHT_Z_INDEX = 50;
const DETAIL_CARD_Z_INDEX = 9999;

const CATEGORY_COLOR: Record<PlaceCategory, string> = {
  음식점: "#F59E0B",
  관광명소: "#0284C7",
  숙박: "#7C3AED",
};

const CATEGORY_CARD_ICON_CLASS: Record<PlaceCategory, string> = {
  음식점: "bg-amber-50 text-amber-500",
  관광명소: "bg-sky-50 text-sky-500",
  숙박: "bg-violet-50 text-violet-500",
};

const CATEGORY_ICON_PATH: Record<PlaceCategory, string> = {
  음식점: `
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  `,
  관광명소: `
    <line x1="3" x2="21" y1="22" y2="22" />
    <line x1="6" x2="6" y1="18" y2="11" />
    <line x1="10" x2="10" y1="18" y2="11" />
    <line x1="14" x2="14" y1="18" y2="11" />
    <line x1="18" x2="18" y1="18" y2="11" />
    <polygon points="12 2 20 7 4 7" />
  `,
  숙박: `
    <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
    <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
    <path d="M12 4v6" />
    <path d="M2 18h20" />
  `,
};

function markerImageForCategory(category: PlaceCategory) {
  const color = CATEGORY_COLOR[category];
  const iconPath = CATEGORY_ICON_PATH[category];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2.5"/>
      <g transform="translate(9,9) scale(0.75)" stroke="white" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        ${iconPath}
      </g>
    </svg>`;
  const src = `data:image/svg+xml;base64,${btoa(svg)}`;
  return new window.kakao.maps.MarkerImage(src, new window.kakao.maps.Size(36, 36));
}

function referencePinImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="54" viewBox="0 0 40 54">
      <path d="M20 52S4 34 4 20a16 16 0 0 1 32 0c0 14-16 32-16 32Z" fill="#DC2626" stroke="white" stroke-width="2.5"/>
      <circle cx="20" cy="20" r="7" fill="white"/>
    </svg>`;
  const src = `data:image/svg+xml;base64,${btoa(svg)}`;
  return new window.kakao.maps.MarkerImage(src, new window.kakao.maps.Size(40, 54), {
    offset: new window.kakao.maps.Point(20, 54),
  });
}

function searchOriginMarkerImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="10" fill="#2563EB" stroke="white" stroke-width="3"/>
    </svg>`;
  const src = `data:image/svg+xml;base64,${btoa(svg)}`;
  return new window.kakao.maps.MarkerImage(src, new window.kakao.maps.Size(26, 26));
}

function bookmarkMarkerImage(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="15" fill="${color}" stroke="white" stroke-width="2.5"/>
      <polygon points="17,8 19.35,14.26 26.03,14.56 20.8,18.74 22.58,25.19 17,21.5 11.42,25.19 13.2,18.74 7.97,14.56 14.65,14.26" fill="white"/>
    </svg>`;
  const src = `data:image/svg+xml;base64,${btoa(svg)}`;
  return new window.kakao.maps.MarkerImage(src, new window.kakao.maps.Size(34, 34));
}

function categoryIconSvg(category: PlaceCategory) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${CATEGORY_ICON_PATH[category]}</svg>`;
}

/** 상세카드 DOM 생성. 주소는 한 줄로 말줄임(...) 처리, 장소명은 링크처럼 클릭 가능 */
// function buildDetailCardElement(
//   place: DbPlace,
//   address: string | null,
//   onClose: () => void,
//   onNameClick: () => void,
// ): HTMLDivElement {
//   const wrapper = document.createElement("div");
//   wrapper.style.marginLeft = "14px";
//   wrapper.style.width = "288px";
//   wrapper.className = "bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-4 relative";

//   const closeBtn = document.createElement("button");
//   closeBtn.className =
//     "absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer";
//   closeBtn.innerHTML =
//     '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
//   closeBtn.onclick = (e) => {
//     e.stopPropagation();
//     onClose();
//   };
//   wrapper.appendChild(closeBtn);

//   const row = document.createElement("div");
//   row.className = "flex gap-3";

//   const iconBox = document.createElement("div");
//   iconBox.className = `w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${CATEGORY_CARD_ICON_CLASS[place.category]}`;
//   iconBox.innerHTML = categoryIconSvg(place.category);
//   row.appendChild(iconBox);

//   const metaCol = document.createElement("div");
//   metaCol.className = "flex-1 min-w-0 space-y-1 pr-4";

//   const nameRow = document.createElement("div");
//   nameRow.className = "relative flex items-center gap-1.5";

//   const nameEl = document.createElement("h3");
//   nameEl.className = "text-sm font-bold text-slate-900 truncate hover:text-sky-600 hover:underline transition-colors cursor-pointer";
//     nameEl.textContent = place.name;
//    nameEl.onclick = (e) => {
//      e.stopPropagation();
//      onNameClick();
//    };

//   nameEl.textContent = place.name;
//   nameRow.appendChild(nameEl);

//   const hoverTip = document.createElement("div");
//   hoverTip.className =
//     "absolute -top-8 left-0 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px] font-medium shadow-lg whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150";
//   hoverTip.textContent = "클릭해서 사이드바 열기";
//   nameRow.appendChild(hoverTip);

//   nameEl.addEventListener("mouseenter", () => {
//     hoverTip.style.opacity = "1";
//   });
//   nameEl.addEventListener("mouseleave", () => {
//     hoverTip.style.opacity = "0";
//   });

//   metaCol.appendChild(nameRow);

//   const categoryRow = document.createElement("p");
//   categoryRow.className = "text-xs text-slate-500 flex items-center gap-1.5";
//   categoryRow.innerHTML = `
//       <span>${place.category}</span>
//       ${place.soloFriendly
//       ? '<span class="px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-semibold">혼밥 가능</span>'
//       : ""
//     }
//     `;
//   metaCol.appendChild(categoryRow);

//   const addressRow = document.createElement("p");
//   addressRow.className = "text-xs text-slate-500 truncate";
//   addressRow.title = address ?? "";
//   addressRow.textContent = address ?? "주소 불러오는 중...";
//   metaCol.appendChild(addressRow);

//   row.appendChild(metaCol);
//   wrapper.appendChild(row);

//   wrapper.onclick = (e) => e.stopPropagation();

//   return wrapper;
// }

// components/KakaoMap.tsx

function buildDetailCardElement(
  place: DbPlace,
  address: string | null,
  onClose: () => void,
  onNameClick: () => void,
): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.style.marginLeft = "14px";
  wrapper.style.width = "288px";
  wrapper.className = "bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-4 relative";

  // 지도 드래그/클릭이 카드 내부로 전파되는 것 차단
  wrapper.addEventListener("mousedown", (e) => e.stopPropagation());
  wrapper.addEventListener("click", (e) => e.stopPropagation());

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className =
    "absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer";
  closeBtn.innerHTML =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClose();
  });
  wrapper.appendChild(closeBtn);

  const row = document.createElement("div");
  row.className = "flex gap-3";

  const iconBox = document.createElement("div");
  iconBox.className = `w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${CATEGORY_CARD_ICON_CLASS[place.category]}`;
  iconBox.innerHTML = categoryIconSvg(place.category);
  row.appendChild(iconBox);

  const metaCol = document.createElement("div");
  metaCol.className = "flex-1 min-w-0 space-y-1 pr-4";

  const nameRow = document.createElement("div");
  nameRow.className = "relative flex items-center gap-1.5";

  // 🌟 [수정 부분]: 장소명 클릭 시 사이드바 열기 연결
  const nameEl = document.createElement("h3");
  nameEl.className =
    "text-sm font-bold text-slate-900 truncate hover:text-sky-600 hover:underline transition-colors cursor-pointer select-none";
  nameEl.textContent = place.name;

  // mousedown 및 click 둘 다 stopPropagation 하여 지도로 클릭이 새어 나가지 않도록 함
  nameEl.addEventListener("mousedown", (e) => e.stopPropagation());
  nameEl.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onNameClick();
  });

  nameRow.appendChild(nameEl);

  const hoverTip = document.createElement("div");
  hoverTip.className =
    "absolute -top-8 left-0 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px] font-medium shadow-lg whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 z-10";
  hoverTip.textContent = "클릭해서 사이드바 열기";
  nameRow.appendChild(hoverTip);

  nameEl.addEventListener("mouseenter", () => {
    hoverTip.style.opacity = "1";
  });
  nameEl.addEventListener("mouseleave", () => {
    hoverTip.style.opacity = "0";
  });

  metaCol.appendChild(nameRow);

  const categoryRow = document.createElement("p");
  categoryRow.className = "text-xs text-slate-500 flex items-center gap-1.5";
  categoryRow.innerHTML = `
      <span>${place.category}</span>
      ${
        place.soloFriendly
          ? '<span class="px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-semibold">혼밥 가능</span>'
          : ""
      }
    `;
  metaCol.appendChild(categoryRow);

  const addressRow = document.createElement("p");
  addressRow.className = "text-xs text-slate-500 truncate";
  addressRow.title = address ?? "";
  addressRow.textContent = address ?? "주소 불러오는 중...";
  metaCol.appendChild(addressRow);

  row.appendChild(metaCol);
  wrapper.appendChild(row);

  return wrapper;
}

function regionOverviewElement(regionName: string, count: number, color: string) {
  const diameter = Math.min(160, Math.max(70, 50 + count / 8));
  const el = document.createElement("div");
  el.style.width = `${diameter}px`;
  el.style.height = `${diameter}px`;
  el.style.backgroundColor = color;
  el.style.opacity = "0.85";
  el.className =
    "rounded-full flex flex-col items-center justify-center text-white font-bold shadow-xl cursor-pointer";
  el.innerHTML = `
    <span style="font-size:${Math.max(12, diameter / 6)}px; font-weight:600;">${regionName}</span>
    <span style="font-size:${Math.max(16, diameter / 4)}px;">${count}</span>
  `;
  return el;
}

function useKakaoReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.kakao?.maps?.services) {
      setReady(true);
      return;
    }
    const interval = setInterval(() => {
      if (window.kakao?.maps?.services) {
        setReady(true);
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);
  return ready;
}

export default function KakaoMap() {
  const {
    isOpen,
    results,
    referenceSpot,
    selectedRegion,
    setSelectedRegion,
    mapSearchRequest,
    setMapSearchRequest,
    openSearchSidebar,
    setSelectedPlace,
    selectedPlace,
    mapFocusRequest,
    placesLoading,
  } = useSearchSidebar();

  const prevIsOpenRef = useRef(isOpen);

  const kakaoReady = useKakaoReady();
  const { showBookmarkMarkers, bookmarkPlaces, bookmarks, bookmarkRegionFilter } = useBookmark();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const referenceMarkerRef = useRef<any>(null);
  const referenceLabelOverlayRef = useRef<any>(null);
  const searchOriginMarkerRef = useRef<any>(null);
  const searchOriginLabelOverlayRef = useRef<any>(null);
  const overviewOverlaysRef = useRef<any[]>([]);
  const isFirstRegionEffect = useRef(true);
  const hoverOverlayRef = useRef<any>(null);
  const detailOverlayRef = useRef<any>(null);
  const justClickedMarkerRef = useRef(false);
  const hasShownResultsRef = useRef(false);

  // 장소 id → 마커 인스턴스 매핑 (선택된 장소의 마커를 찾아 z-index를 올리기 위함)
  const markersByIdRef = useRef<Map<string, any>>(new Map());
  const highlightedMarkerRef = useRef<any>(null);

  const bookmarkMarkersRef = useRef<any[]>([]);
  const hasFitBookmarksOnceRef = useRef(false);

  const isProgrammaticMoveRef = useRef(false);
  const programmaticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const returnBoundsRef = useRef<any>(null);
  const returnCenterRef = useRef<any>(null);
  const [hasReturnTarget, setHasReturnTarget] = useState(false);
  const [showResearchButton, setShowResearchButton] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [detailAddress, setDetailAddress] = useState<string | null>(null);
  const [regionTotals, setRegionTotals] = useState<Record<PlaceRegion, number> | null>(null);
  const [isRegionSwitching, setIsRegionSwitching] = useState(false);

  useEffect(() => {
    fetchRegionTotals().then(setRegionTotals);
  }, []);

  function markProgrammaticMove() {
    isProgrammaticMoveRef.current = true;
    if (programmaticTimeoutRef.current) clearTimeout(programmaticTimeoutRef.current);
    programmaticTimeoutRef.current = setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, PROGRAMMATIC_MOVE_GUARD_MS);
  }

  function clearOverviewOverlays() {
    overviewOverlaysRef.current.forEach((o) => o.setMap(null));
    overviewOverlaysRef.current = [];
  }

  // function attachHoverAndClick(marker: any, place: DbPlace) {
  //   window.kakao.maps.event.addListener(marker, "mouseover", () => {
  //     if (hoverOverlayRef.current) hoverOverlayRef.current.setMap(null);

  //     const content = document.createElement("div");
  //     content.style.transform = "translate(-50%, -140%)";
  //     content.className =
  //       "px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-medium shadow-lg whitespace-nowrap";
  //     content.textContent = `${place.name} · ${place.category}`;

  //     const overlay = new window.kakao.maps.CustomOverlay({
  //       position: marker.getPosition(),
  //       content,
  //       zIndex: 20,
  //     });
  //     overlay.setMap(mapInstanceRef.current);
  //     hoverOverlayRef.current = overlay;
  //   });

  //   window.kakao.maps.event.addListener(marker, "mouseout", () => {
  //     if (hoverOverlayRef.current) {
  //       hoverOverlayRef.current.setMap(null);
  //       hoverOverlayRef.current = null;
  //     }
  //   });

  //   window.kakao.maps.event.addListener(marker, "click", () => {
  //     justClickedMarkerRef.current = true;
  //     setSelectedPlace(place);

  //     // 마커 클릭 시 지도를 부드럽게 그 위치로 이동 (확대/사이드바는 그대로)
  //     markProgrammaticMove();
  //     mapInstanceRef.current?.panTo(marker.getPosition());

  //     setTimeout(() => {
  //       justClickedMarkerRef.current = false;
  //     }, 0);
  //   });
  // }

  // 지도 최초 생성
  useEffect(() => {
    if (!kakaoReady || !mapContainerRef.current || mapInstanceRef.current) return;

    window.kakao.maps.load(() => {
      const map = new window.kakao.maps.Map(mapContainerRef.current, {
        center: new window.kakao.maps.LatLng(PENINSULA_CENTER.lat, PENINSULA_CENTER.lng),
        level: PENINSULA_LEVEL,
      });
      mapInstanceRef.current = map;

      clustererRef.current = new window.kakao.maps.MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: 6,
        disableClickZoom: false,
      });

      window.kakao.maps.event.addListener(map, "dragend", () => {
        if (isProgrammaticMoveRef.current) return;
        setShowResearchButton(true);
      });
      window.kakao.maps.event.addListener(map, "zoom_changed", () => {
        if (isProgrammaticMoveRef.current) return;
        setShowResearchButton(true);
      });

      window.kakao.maps.event.addListener(map, "click", () => {
        if (justClickedMarkerRef.current) return;
        setSelectedPlace(null);
      });
    });
  }, [kakaoReady]);

  // 지역 전환 시 즉시 대략적인 위치로 이동
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (isFirstRegionEffect.current) {
      isFirstRegionEffect.current = false;
      return;
    }

    setIsRegionSwitching(true);

    markProgrammaticMove();
    if (selectedRegion) {
      const center = REGION_CENTER[selectedRegion];
      mapInstanceRef.current.setLevel(REGION_LEVEL);
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(center.lat, center.lng));
    } else {
      mapInstanceRef.current.setLevel(PENINSULA_LEVEL);
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(PENINSULA_CENTER.lat, PENINSULA_CENTER.lng));
    }
    setShowResearchButton(false);
    returnBoundsRef.current = null;
    returnCenterRef.current = null;
    setHasReturnTarget(false);
  }, [selectedRegion]);

  // 한반도 전체뷰: 지역별 개요 원
  useEffect(() => {
    if (!kakaoReady || !mapInstanceRef.current || !clustererRef.current) return;
    if (selectedRegion) return;
    if (!regionTotals) return;

    clustererRef.current.clear();
    clearOverviewOverlays();

    (Object.keys(REGION_CENTER) as PlaceRegion[]).forEach((region) => {
      const center = REGION_CENTER[region];
      const el = regionOverviewElement(region, regionTotals[region], REGION_OVERVIEW_COLOR[region]);
      el.onclick = () => setSelectedRegion(region);

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(center.lat, center.lng),
        content: el,
        zIndex: 15,
      });
      overlay.setMap(mapInstanceRef.current);
      overviewOverlaysRef.current.push(overlay);
    });

    hasShownResultsRef.current = true;
  }, [selectedRegion, regionTotals, kakaoReady]);

  useEffect(() => {
    if (!placesLoading) setIsRegionSwitching(false);
  }, [placesLoading]);

  // 지역 선택 시: 개별 마커/클러스터링
  useEffect(() => {
    if (!kakaoReady || !mapInstanceRef.current || !clustererRef.current) return;
    if (!selectedRegion) return;

    clearOverviewOverlays();
    clustererRef.current.clear();
    markersByIdRef.current.clear();
    if (referenceMarkerRef.current) {
      referenceMarkerRef.current.setMap(null);
      referenceMarkerRef.current = null;
    }
    if (referenceLabelOverlayRef.current) {
      referenceLabelOverlayRef.current.setMap(null);
      referenceLabelOverlayRef.current = null;
    }

    const bounds = new window.kakao.maps.LatLngBounds();
    let hasAny = false;

    const clusterTargets: DbPlace[] = results.filter((p) => p.id !== referenceSpot?.id);

    const newMarkers = clusterTargets.map((place) => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      bounds.extend(position);
      hasAny = true;
      const marker = new window.kakao.maps.Marker({ position, image: markerImageForCategory(place.category) });
      marker.__baseZIndex = 1;
      attachHoverAndClick(marker, place);
      markersByIdRef.current.set(place.id, marker);
      return marker;
    });

    clustererRef.current.addMarkers(newMarkers);

    if (referenceSpot) {
      const position = new window.kakao.maps.LatLng(referenceSpot.lat, referenceSpot.lng);

      const marker = new window.kakao.maps.Marker({ position, image: referencePinImage(), zIndex: 10 });
      marker.__baseZIndex = 10;
      marker.setMap(mapInstanceRef.current);
      referenceMarkerRef.current = marker;
      markersByIdRef.current.set(referenceSpot.id, marker);

      attachHoverAndClick(marker, {
        id: referenceSpot.id,
        name: referenceSpot.name,
        category: "관광명소",
        lat: referenceSpot.lat,
        lng: referenceSpot.lng,
        soloFriendly: false,
        ageGroups: [],
      });

      const labelEl = document.createElement("div");
      labelEl.style.transform = "translate(-50%, -68px)";
      labelEl.className =
        "px-2 py-0.5 rounded-full bg-slate-900/90 text-white text-[10px] font-semibold shadow whitespace-nowrap pointer-events-none";
      labelEl.textContent = "기준 장소";
      const labelOverlay = new window.kakao.maps.CustomOverlay({ position, content: labelEl, zIndex: 9 });
      labelOverlay.setMap(mapInstanceRef.current);
      referenceLabelOverlayRef.current = labelOverlay;

      bounds.extend(position);
      hasAny = true;
    }

    if (mapSearchRequest) {
      const originLat = mapSearchRequest.lat;
      const originLng = mapSearchRequest.lng;

      let maxLatOffset = 0.01;
      let maxLngOffset = 0.01;
      if (referenceSpot) {
        maxLatOffset = Math.max(maxLatOffset, Math.abs(referenceSpot.lat - originLat));
        maxLngOffset = Math.max(maxLngOffset, Math.abs(referenceSpot.lng - originLng));
      }

      const symmetricBounds = new window.kakao.maps.LatLngBounds(
        new window.kakao.maps.LatLng(originLat - maxLatOffset, originLng - maxLngOffset),
        new window.kakao.maps.LatLng(originLat + maxLatOffset, originLng + maxLngOffset),
      );

      markProgrammaticMove();
      mapInstanceRef.current.setBounds(symmetricBounds);
      mapInstanceRef.current.setCenter(new window.kakao.maps.LatLng(originLat, originLng));

      returnBoundsRef.current = symmetricBounds;
      returnCenterRef.current = new window.kakao.maps.LatLng(originLat, originLng);
      setHasReturnTarget(true);
    } else if (hasAny) {
      markProgrammaticMove();
      mapInstanceRef.current.setBounds(bounds);

      returnBoundsRef.current = bounds;
      returnCenterRef.current = null;
      setHasReturnTarget(true);
    }

    hasShownResultsRef.current = true;
  }, [results, referenceSpot, selectedRegion, mapSearchRequest, kakaoReady]);

  // 검색 원좌표(현 지도 중심/GPS) 마커
  useEffect(() => {
    if (!kakaoReady || !mapInstanceRef.current) return;

    if (searchOriginMarkerRef.current) {
      searchOriginMarkerRef.current.setMap(null);
      searchOriginMarkerRef.current = null;
    }
    if (searchOriginLabelOverlayRef.current) {
      searchOriginLabelOverlayRef.current.setMap(null);
      searchOriginLabelOverlayRef.current = null;
    }

    if (!mapSearchRequest) return;

    const position = new window.kakao.maps.LatLng(mapSearchRequest.lat, mapSearchRequest.lng);

    const marker = new window.kakao.maps.Marker({ position, image: searchOriginMarkerImage(), zIndex: 8 });
    marker.setMap(mapInstanceRef.current);
    searchOriginMarkerRef.current = marker;

    const labelEl = document.createElement("div");
    labelEl.style.transform = "translate(-50%, -44px)";
    labelEl.className =
      "px-2 py-0.5 rounded-full bg-blue-600/90 text-white text-[10px] font-semibold shadow whitespace-nowrap pointer-events-none";
    labelEl.textContent = "현재 검색 위치";
    const labelOverlay = new window.kakao.maps.CustomOverlay({ position, content: labelEl, zIndex: 7 });
    labelOverlay.setMap(mapInstanceRef.current);
    searchOriginLabelOverlayRef.current = labelOverlay;
  }, [mapSearchRequest, kakaoReady]);

  // 사이드바 리스트에서 선택했을 때만 지도 이동 + 확대
  useEffect(() => {
    if (!mapInstanceRef.current || !mapFocusRequest) return;
    markProgrammaticMove();
    mapInstanceRef.current.setLevel(SELECTED_PLACE_LEVEL);
    mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(mapFocusRequest.lat, mapFocusRequest.lng));
  }, [mapFocusRequest]);

  // 선택된 장소의 마커 z-index를 사이드바 배경보다 높여서, 흐려진 지도 위로 튀어나오게 함
  useEffect(() => {
    const prev = highlightedMarkerRef.current;
    if (prev) {
      prev.setZIndex(prev.__baseZIndex ?? 1);
      highlightedMarkerRef.current = null;
    }
    if (!selectedPlace) return;
    const marker = markersByIdRef.current.get(selectedPlace.id);
    if (marker) {
      marker.setZIndex(HIGHLIGHT_Z_INDEX);
      highlightedMarkerRef.current = marker;
    }
  }, [selectedPlace]);

  // 장소 선택 시 주소 조회
  useEffect(() => {
    if (!selectedPlace) {
      setDetailAddress(null);
      return;
    }
    setDetailAddress(null);
    let cancelled = false;
    reverseGeocode(selectedPlace.lat, selectedPlace.lng).then((address) => {
      if (!cancelled) setDetailAddress(address);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedPlace]);

  /**
   * 상세카드의 장소명을 클릭했을 때: 사이드바를 열고, [사이드바 | 마커+카드]가
   * 균등 간격으로 배치되도록 지도 중심을 픽셀 단위로 이동시킴.
   * kakao의 Projection(좌표↔화면픽셀 변환)을 이용해, 마커의 화면상 x좌표가
   * 원하는 위치(사이드바 폭 + 여백)에 오도록 지도 중심 좌표를 재계산.
   */

  const preSidebarCenterRef = useRef<any>(null);

  function handleOpenSidebarFromCard() {
    if (mapInstanceRef.current) {
      preSidebarCenterRef.current = mapInstanceRef.current.getCenter(); // 열리기 전 중심 저장
    }

    openSearchSidebar();

    requestAnimationFrame(() => {
      const map = mapInstanceRef.current;
      if (!map || !selectedPlace || !mapContainerRef.current) {
        return;
      }
      const projection = map.getProjection();
      const markerPos = new window.kakao.maps.LatLng(selectedPlace.lat, selectedPlace.lng);
      const markerPoint = projection.containerPointFromCoords(markerPos);

      const viewportWidth = mapContainerRef.current.clientWidth;
      const groupWidth = MARKER_ICON_HALF_PX * 2 + CARD_GAP_PX + CARD_WIDTH_PX;
      const gap = Math.max(16, (viewportWidth - SIDEBAR_WIDTH_PX - groupWidth) / 2);
      const desiredX = SIDEBAR_WIDTH_PX + gap + MARKER_ICON_HALF_PX;
      const deltaX = desiredX - markerPoint.x;

      const centerPoint = projection.containerPointFromCoords(map.getCenter());
      const targetPoint = new window.kakao.maps.Point(centerPoint.x - deltaX, centerPoint.y);
      const targetCoords = projection.coordsFromContainerPoint(targetPoint);

      markProgrammaticMove();
      map.panTo(targetCoords);
    });
  }

  // 닫힐 때 복귀 로직
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (wasOpen && !isOpen && preSidebarCenterRef.current) {
      markProgrammaticMove();
      mapInstanceRef.current?.panTo(preSidebarCenterRef.current);
      preSidebarCenterRef.current = null;
    }
  }, [isOpen]);

  // 선택된 장소 옆에 상세카드(CustomOverlay) 표시
  
  function handleFocusAndOpenSidebar(place: DbPlace) {
    setSelectedPlace(place);
    openSearchSidebar();

    requestAnimationFrame(() => {
      const map = mapInstanceRef.current;
      if (!map || !mapContainerRef.current) return;

      const projection = map.getProjection();
      const markerPos = new window.kakao.maps.LatLng(place.lat, place.lng);
      const markerPoint = projection.containerPointFromCoords(markerPos);

      const viewportWidth = mapContainerRef.current.clientWidth;
      const groupWidth = MARKER_ICON_HALF_PX * 2 + CARD_GAP_PX + CARD_WIDTH_PX;
      const gap = Math.max(16, (viewportWidth - SIDEBAR_WIDTH_PX - groupWidth) / 2);
      const desiredX = SIDEBAR_WIDTH_PX + gap + MARKER_ICON_HALF_PX;
      const deltaX = desiredX - markerPoint.x;

      const centerPoint = projection.containerPointFromCoords(map.getCenter());
      const targetPoint = new window.kakao.maps.Point(centerPoint.x - deltaX, centerPoint.y);
      const targetCoords = projection.coordsFromContainerPoint(targetPoint);

      markProgrammaticMove();
      map.panTo(targetCoords);
    });
  }

  function attachHoverAndClick(marker: any, place: DbPlace) {
    window.kakao.maps.event.addListener(marker, "mouseover", () => {
      if (hoverOverlayRef.current) hoverOverlayRef.current.setMap(null);

      const content = document.createElement("div");
      content.style.transform = "translate(-50%, -140%)";
      content.className =
        "px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-medium shadow-lg whitespace-nowrap";
      content.textContent = `${place.name} · ${place.category}`;

      const overlay = new window.kakao.maps.CustomOverlay({
        position: marker.getPosition(),
        content,
        zIndex: 20,
      });
      overlay.setMap(mapInstanceRef.current);
      hoverOverlayRef.current = overlay;
    });

    window.kakao.maps.event.addListener(marker, "mouseout", () => {
      if (hoverOverlayRef.current) {
        hoverOverlayRef.current.setMap(null);
        hoverOverlayRef.current = null;
      }
    });

    // 🌟 마커를 클릭했을 때 바로 사이드바를 열고 중심을 맞춤
    // window.kakao.maps.event.addListener(marker, "click", () => {
    //   justClickedMarkerRef.current = true;
    //   handleFocusAndOpenSidebar(place);

    //   setTimeout(() => {
    //     justClickedMarkerRef.current = false;
    //   }, 0);
    // });

    window.kakao.maps.event.addListener(marker, "click", () => {
      justClickedMarkerRef.current = true;
      setSelectedPlace(place); // 마커 클릭 시에는 상세 카드만 뜸

      markProgrammaticMove();
      mapInstanceRef.current?.panTo(marker.getPosition());

      setTimeout(() => {
        justClickedMarkerRef.current = false;
      }, 0);
    });
  }

  // useEffect(() => {
  //   if (!mapInstanceRef.current) return;

  //   if (detailOverlayRef.current) {
  //     detailOverlayRef.current.setMap(null);
  //     detailOverlayRef.current = null;
  //   }

  //   if (!selectedPlace) return;

  //   const content = buildDetailCardElement(
  //     selectedPlace,
  //     detailAddress,
  //     () => setSelectedPlace(null),
  //     handleOpenSidebarFromCard,
  //   );
  //   const overlay = new window.kakao.maps.CustomOverlay({
  //     position: new window.kakao.maps.LatLng(selectedPlace.lat, selectedPlace.lng),
  //     content,
  //     xAnchor: 0,
  //     yAnchor: 0.5,
  //     zIndex: DETAIL_CARD_Z_INDEX,
  //   });
  //   overlay.setMap(mapInstanceRef.current);
  //   detailOverlayRef.current = overlay;
  //   return () => {
  //     overlay.setMap(null);
  //     if (detailOverlayRef.current === overlay) {
  //       detailOverlayRef.current = null;
  //     }
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [selectedPlace, detailAddress]);

  // 선택된 장소 옆에 상세카드(CustomOverlay) 표시
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (detailOverlayRef.current) {
      detailOverlayRef.current.setMap(null);
      detailOverlayRef.current = null;
    }

    if (!selectedPlace) return;

    const content = buildDetailCardElement(
      selectedPlace,
      detailAddress,
      () => setSelectedPlace(null),
      handleOpenSidebarFromCard, // 카드 제목 클릭 시 재동작
    );
    const overlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(selectedPlace.lat, selectedPlace.lng),
      content,
      xAnchor: 0,
      yAnchor: 0.5,
      zIndex: DETAIL_CARD_Z_INDEX,
    });
    overlay.setMap(mapInstanceRef.current);
    detailOverlayRef.current = overlay;
    return () => {
      overlay.setMap(null);
      if (detailOverlayRef.current === overlay) {
        detailOverlayRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlace, detailAddress]);

  async function handleResearchClick() {
    if (!mapInstanceRef.current || !selectedRegion) return;
    const center = mapInstanceRef.current.getCenter();
    const lat = center.getLat();
    const lng = center.getLng();

    setShowResearchButton(false);
    const label = await reverseGeocode(lat, lng);
    setMapSearchRequest({ lat, lng, label: `현 검색 위치: ${label}` });
    openSearchSidebar();
  }

  function handleMyLocationClick() {
    if (!selectedRegion) return;
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const label = await reverseGeocode(latitude, longitude);
        setMapSearchRequest({ lat: latitude, lng: longitude, label: `현 검색 위치: ${label}` });
        openSearchSidebar();
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
    );
  }

  function handleReturnClick() {
    if (!mapInstanceRef.current || !returnBoundsRef.current) return;
    markProgrammaticMove();
    mapInstanceRef.current.setBounds(returnBoundsRef.current);
    if (returnCenterRef.current) {
      mapInstanceRef.current.setCenter(returnCenterRef.current);
    }
    setShowResearchButton(false);
  }

  const showLoadingOverlay = !kakaoReady || (placesLoading && !hasShownResultsRef.current) || isRegionSwitching;


  // 북마크한 장소 마커 (클러스터러와 별개로 직접 표시 — 검색 결과/지역이 바뀌어도 유지)
  useEffect(() => {
    if (!kakaoReady || !mapInstanceRef.current) return;

    bookmarkMarkersRef.current.forEach((m) => m.setMap(null));
    bookmarkMarkersRef.current = [];

    if (!showBookmarkMarkers || bookmarkPlaces.length === 0) return;

    const regionById = new Map(bookmarks.map((b) => [b.spotId, b.region]));

    const visiblePlaces =
      bookmarkRegionFilter === "전체"
        ? bookmarkPlaces
       : bookmarkPlaces.filter((p) => regionById.get(p.id) === bookmarkRegionFilter);

   if (visiblePlaces.length === 0) return;

    const bounds = new window.kakao.maps.LatLngBounds();
    visiblePlaces.forEach((place) => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      const region = regionById.get(place.id) as PlaceRegion | undefined;
      const color = region ? REGION_OVERVIEW_COLOR[region] : "#FBBF24";
      const marker = new window.kakao.maps.Marker({ position, image: bookmarkMarkerImage(color), zIndex: 5 });
    
      marker.setMap(mapInstanceRef.current);
      attachHoverAndClick(marker, place);
      bookmarkMarkersRef.current.push(marker);
      bounds.extend(position);
    });

  // 세션 통틀어 "정말 처음" 북마크 마커를 보여줄 때만 화면을 맞추고, 이후로는 건드리지 않음
  if (!hasFitBookmarksOnceRef.current) {
     hasFitBookmarksOnceRef.current = true;
      markProgrammaticMove();
      if (visiblePlaces.length === 1) {
        mapInstanceRef.current.setLevel(4);
        mapInstanceRef.current.panTo(
          new window.kakao.maps.LatLng(visiblePlaces[0].lat, visiblePlaces[0].lng),
        );
      } else {
        mapInstanceRef.current.setBounds(bounds);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showBookmarkMarkers, bookmarkPlaces, bookmarks, bookmarkRegionFilter, kakaoReady]);

  return (
    <div className="fixed inset-0">
      <div ref={mapContainerRef} className="w-full h-full" />
      <MapControls />
      <BookmarkPanel />

      {selectedRegion && showResearchButton && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {hasReturnTarget && (
            <button
              type="button"
              onClick={handleReturnClick}
              className="flex items-center gap-1.5 bg-white shadow-lg rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              검색 위치로 돌아가기
            </button>
          )}
          <button
            type="button"
            onClick={handleResearchClick}
            className="flex items-center gap-1.5 bg-white shadow-lg rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            현 지도에서 검색
          </button>
        </div>
      )}

      {selectedRegion && (
        <button
          type="button"
          onClick={handleMyLocationClick}
          disabled={isLocating}
          className="absolute bottom-24 right-4 z-20 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          aria-label="내 위치 주변 검색"
        >
          <LocateFixed className={`w-5 h-5 ${isLocating ? "animate-pulse" : ""}`} />
        </button>
      )}

      {showLoadingOverlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 text-sm text-slate-500 z-40 pointer-events-none">
          <Loader2 className="w-7 h-7 animate-spin text-sky-500" />
          <span>잠시만 기다려주세요</span>
        </div>
      )}
    </div>
  );
}