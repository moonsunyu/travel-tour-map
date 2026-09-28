// components/BookmarkPanel.tsx
"use client";

import { useState } from "react";
import { Landmark, Star, Utensils, BedDouble } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBookmark } from "@/context/BookmarkContext";
import { useSearchSidebar } from "@/context/SearchSidebarContext";
import { PlaceRegion } from "@/lib/places";

const CATEGORY_ICON: Record<string, typeof Utensils> = {
  음식점: Utensils,
  관광명소: Landmark,
  숙박: BedDouble,
};

const REGION_DOT_COLOR: Record<string, string> = {
  강원도: "#4F46E5",
  여수: "#0D9488",
};

const REGION_FILTERS: ("전체" | PlaceRegion)[] = ["전체", "강원도", "여수"];

export default function BookmarkPanel() {
  const { user, openAuthModal } = useAuth();
  const {
    bookmarks,
    showBookmarkMarkers,
    setShowBookmarkMarkers,
    bookmarkPlaces,
    bookmarkPlacesLoading,
    bookmarkRegionFilter,
    setBookmarkRegionFilter,
  } = useBookmark();
  const { setSelectedPlace, setMapFocusRequest } = useSearchSidebar();

  // 목록 열림/닫힘은 마커 표시와 별개로 관리 — 항목 클릭 시 목록만 닫고 마커는 유지
  const [isListOpen, setIsListOpen] = useState(false);
  // const [regionFilter, setRegionFilter] = useState<"전체" | PlaceRegion>("전체");

  const handleToggle = () => {
    if (!user) {
      openAuthModal("login");
      return;
    }
    const next = !isListOpen;
    setIsListOpen(next);
    setShowBookmarkMarkers(next); // 버튼은 목록+마커를 함께 켜고 끔
  };

  const handleItemClick = (spotId: string) => {
    const place = bookmarkPlaces.find((p) => p.id === spotId);
    if (!place) return; // 좌표 로딩 전이면 무시
    setSelectedPlace(place);
    setMapFocusRequest(place);
    setIsListOpen(false); // 목록만 닫음 — 마커(showBookmarkMarkers)는 건드리지 않음
  };

  const filteredBookmarks =
    bookmarkRegionFilter === "전체" ? bookmarks : bookmarks.filter((b) => b.region === bookmarkRegionFilter);

  return (
    <div className="absolute bottom-6 left-4 z-20">
      <div
        className={`absolute bottom-14 left-0 w-72 max-h-96 flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200/80 transition-all duration-200 ease-out origin-bottom-left ${
          isListOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 translate-y-2 pointer-events-none"
        }`}
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-sm font-bold text-slate-800">북마크한 장소</span>
          <span className="text-xs text-slate-400">{filteredBookmarks.length}곳</span>
        </div>

        {bookmarks.length > 0 && (
          <div className="px-3 pt-2.5 flex gap-1.5 shrink-0">
            {REGION_FILTERS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setBookmarkRegionFilter(r)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                  bookmarkRegionFilter === r
                    ? "bg-sky-600 border-sky-600 text-white"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {bookmarks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 px-4">
              아직 북마크한 장소가 없어요.
            </p>
          ) : filteredBookmarks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 px-4">
              이 지역에 북마크한 장소가 없어요.
            </p>
          ) : (
            <div className="space-y-1">
              {filteredBookmarks.map((b) => {
                const Icon = CATEGORY_ICON[b.category ?? ""] ?? Landmark;
                const dotColor = REGION_DOT_COLOR[b.region] ?? "#64748B";
                const coordsReady = bookmarkPlaces.some((p) => p.id === b.spotId);
                return (
                  <button
                    key={b.spotId}
                    type="button"
                    onClick={() => handleItemClick(b.spotId)}
                    disabled={!coordsReady}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-left cursor-pointer"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                      title={b.region}
                    />
                    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{b.spotName}</p>
                      <p className="text-[10px] text-slate-400">
                        {b.region} · {b.category ?? "장소"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={isListOpen}
        title={isListOpen ? "북마크 목록 닫기" : "북마크한 장소를 지도에 표시"}
        className={`flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full shadow-lg border text-sm font-semibold cursor-pointer transition-colors ${
          isListOpen
            ? "bg-amber-400 border-amber-400 text-white"
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
        }`}
      >
        <Star className={`w-4 h-4 ${isListOpen ? "fill-white" : "fill-amber-400 text-amber-400"}`} />
        <span>북마크{user ? ` ${bookmarks.length}` : ""}</span>
        {bookmarkPlacesLoading && (
          <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
        )}
      </button>
    </div>
  );
}