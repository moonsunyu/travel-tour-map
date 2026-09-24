// components/KakaoMap.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchSidebar } from "@/context/SearchSidebarContext";
import { DbPlace, PlaceCategory, PlaceRegion, fetchRegionTotals } from "@/lib/places";
import { reverseGeocode } from "@/lib/kakaoGeocode";
import MapControls from "@/components/MapControls";
import { Loader2, LocateFixed, RefreshCw, Undo2 } from "lucide-react";

const REGION_CENTER: Record<PlaceRegion, { lat: number; lng: number }> = {
  강원도: { lat: 37.8228, lng: 128.1555 },
  여수: { lat: 34.7604, lng: 127.6622 },
};

const REGION_OVERVIEW_COLOR: Record<PlaceRegion, string> = {
  강원도: "#4F46E5", // indigo
  여수: "#0D9488", // teal
};

const PENINSULA_CENTER = { lat: 36.3, lng: 127.8 };
const PENINSULA_LEVEL = 13;
const REGION_LEVEL = 9;
const SELECTED_PLACE_LEVEL = 2;
const PROGRAMMATIC_MOVE_GUARD_MS = 700;

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

function categoryIconSvg(category: PlaceCategory) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${CATEGORY_ICON_PATH[category]}</svg>`;
}

function buildDetailCardElement(place: DbPlace, address: string | null, onClose: () => void): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.style.marginLeft = "14px";
  wrapper.className = "bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-4 w-72 relative";

  const closeBtn = document.createElement("button");
  closeBtn.className =
    "absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer";
  closeBtn.innerHTML =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    onClose();
  };
  wrapper.appendChild(closeBtn);

  const row = document.createElement("div");
  row.className = "flex gap-3";
  row.innerHTML = `
    <div class="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${CATEGORY_CARD_ICON_CLASS[place.category]}">
      ${categoryIconSvg(place.category)}
    </div>
    <div class="flex-1 min-w-0 space-y-1 pr-4">
      <h3 class="text-sm font-bold text-slate-900 truncate">${place.name}</h3>
      <p class="text-xs text-slate-500 flex items-center gap-1.5">
        <span>${place.category}</span>
        ${place.soloFriendly
      ? '<span class="px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-semibold">혼밥 가능</span>'
      : ""
    }
      </p>
      <p class="text-xs text-slate-500 leading-snug">${address ?? "주소 불러오는 중..."}</p>
    </div>
  `;
  wrapper.appendChild(row);
  wrapper.onclick = (e) => e.stopPropagation();

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
  const kakaoReady = useKakaoReady();

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

    window.kakao.maps.event.addListener(marker, "click", () => {
      justClickedMarkerRef.current = true;
      setSelectedPlace(place);
      setTimeout(() => {
        justClickedMarkerRef.current = false;
      }, 0);
    });
  }

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

    setIsRegionSwitching(true); // 새 지역 데이터가 다 로딩될 때까지 오버레이로 가림

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

  // 새 지역의 pool/검색 결과 로딩이 끝나면(=placesLoading이 false가 되면) 오버레이 해제
  useEffect(() => {
    if (!placesLoading) setIsRegionSwitching(false);
  }, [placesLoading]);

  // 한반도 전체뷰: 지역별 개요 원 두 개 표시 (지역 미선택 상태일 때만)
  useEffect(() => {
    if (!kakaoReady || !mapInstanceRef.current || !clustererRef.current) return;
    if (selectedRegion) return; // 지역 선택 시엔 아래의 개별 마커 effect가 처리
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

  // 지역 선택 시: 개요 원 지우고, 기존처럼 개별 마커/클러스터링
  useEffect(() => {
    if (!kakaoReady || !mapInstanceRef.current || !clustererRef.current) return;
    if (!selectedRegion) return; // 한반도 뷰는 위의 effect가 처리

    clearOverviewOverlays();
    clustererRef.current.clear();
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
      attachHoverAndClick(marker, place);
      return marker;
    });

    clustererRef.current.addMarkers(newMarkers);

    if (referenceSpot) {
      const position = new window.kakao.maps.LatLng(referenceSpot.lat, referenceSpot.lng);

      const marker = new window.kakao.maps.Marker({ position, image: referencePinImage(), zIndex: 10 });
      marker.setMap(mapInstanceRef.current);
      referenceMarkerRef.current = marker;

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
      // 검색 위치가 항상 정중앙에 오도록, 그 좌표를 중심으로 "대칭인" 사각형을 만들어서 fit.
      // 기준 장소가 멀리 있으면 대칭 범위도 그만큼 커져서 자동으로 더 멀리(축소) 보이면서도
      // 검색 위치는 여전히 정중앙을 유지함.
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
      // setBounds의 내부 여백 계산으로 중심이 아주 살짝 어긋날 수 있어 한 번 더 명시적으로 고정
      mapInstanceRef.current.setCenter(new window.kakao.maps.LatLng(originLat, originLng));

      returnBoundsRef.current = symmetricBounds;
      returnCenterRef.current = new window.kakao.maps.LatLng(originLat, originLng);
      setHasReturnTarget(true);
    } else if (hasAny) {
      markProgrammaticMove();
      mapInstanceRef.current.setBounds(bounds);

      returnBoundsRef.current = bounds;
      returnCenterRef.current = null;
      setHasReturnTarget(true)
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

  // 사이드바 리스트에서 선택했을 때만(마커 클릭은 제외) 지도 이동 + 확대
  useEffect(() => {
    if (!mapInstanceRef.current || !mapFocusRequest) return;
    markProgrammaticMove();
    mapInstanceRef.current.setLevel(SELECTED_PLACE_LEVEL);
    mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(mapFocusRequest.lat, mapFocusRequest.lng));
  }, [mapFocusRequest]);


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

  // 선택된 장소 옆에 상세카드(CustomOverlay) 표시
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (detailOverlayRef.current) {
      detailOverlayRef.current.setMap(null);
      detailOverlayRef.current = null;
    }

    if (!selectedPlace) return;

    const content = buildDetailCardElement(selectedPlace, detailAddress, () => setSelectedPlace(null));
    const overlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(selectedPlace.lat, selectedPlace.lng),
      content,
      xAnchor: 0,
      yAnchor: 0.5,
      zIndex: 30,
    });
    overlay.setMap(mapInstanceRef.current);
    detailOverlayRef.current = overlay;
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

  return (
    <div className="fixed inset-0">
      <div ref={mapContainerRef} className="w-full h-full" />
      <MapControls />

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