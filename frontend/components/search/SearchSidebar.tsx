"use client";

import { BedDouble, ChevronDown, Landmark, MapPin, Search, Star, Utensils, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchSidebar } from "@/context/SearchSidebarContext";
import { AgeGroupFilter, MOCK_PLACES, PlaceCategory, PlaceRegion, REGION_TOTALS } from "@/lib/mockPlaces";

// 검색 버튼(세줄바) → 왼쪽에서 열리는 사이드바. 아직 실제 장소 검색 API가 연동되지 않아
// lib/mockPlaces.ts의 예시 데이터로 지역/카테고리/혼밥여부/나이대 필터와 정렬 UI 흐름만 보여준다.
// 실제 연동 시 MOCK_PLACES 대신 API 응답을 쓰고, 아래 필터링 로직은 서버 쿼리로 옮기면 된다.

const CATEGORY_OPTIONS: { value: PlaceCategory | "전체"; label: string; icon?: React.ReactNode }[] = [
  { value: "전체", label: "전체" },
  { value: "음식점", label: "음식점", icon: <Utensils className="w-3.5 h-3.5" /> },
  { value: "관광명소", label: "관광명소", icon: <Landmark className="w-3.5 h-3.5" /> },
  { value: "숙박", label: "숙박", icon: <BedDouble className="w-3.5 h-3.5" /> },
];

const AGE_GROUP_OPTIONS: { value: AgeGroupFilter; label: string }[] = [
  { value: "전체", label: "전체 나이대" },
  { value: "20", label: "20대 인기" },
  { value: "30", label: "30대 인기" },
  { value: "40", label: "40대 인기" },
  { value: "50", label: "50대 인기" },
  { value: "60", label: "60대 인기" },
];

const REFERENCE_POINT: Record<PlaceRegion, string> = {
  강원도: "경포호 광장",
  여수시: "여수 엑스포장",
};

export const SearchSidebar: React.FC = () => {
  const { isOpen, closeSearchSidebar } = useSearchSidebar();
  const [query, setQuery] = useState("");
  // 입력창에 타이핑하는 것만으로는 필터링하지 않고, 엔터/검색 버튼으로 제출했을 때의
  // 값만 검색어로 반영한다 (실제 API 연동 시 요청을 매 키 입력마다 안 쏘려는 의도).
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<PlaceRegion>("강원도");
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | "전체">("전체");
  const [soloOnly, setSoloOnly] = useState(false);
  const [ageGroup, setAgeGroup] = useState<AgeGroupFilter>("전체");
  const [sortBy, setSortBy] = useState<"거리순" | "연관순위">("연관순위");
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearchSidebar();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeSearchSidebar]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(query.trim());
  };

  const handleClearQuery = () => {
    setQuery("");
    setSubmittedQuery("");
    inputRef.current?.focus();
  };

  const results = useMemo(() => {
    const trimmedQuery = submittedQuery;
    const filtered = MOCK_PLACES.filter((place) => {
      if (place.region !== selectedRegion) return false;
      if (selectedCategory !== "전체" && place.category !== selectedCategory) return false;
      if (soloOnly && !place.soloFriendly) return false;
      if (ageGroup !== "전체" && place.ageGroup !== "전체" && place.ageGroup !== ageGroup) return false;
      if (trimmedQuery && !place.name.includes(trimmedQuery)) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) =>
      sortBy === "거리순" ? a.walkMinutes - b.walkMinutes : b.reviewCount - a.reviewCount,
    );
  }, [selectedRegion, selectedCategory, soloOnly, ageGroup, submittedQuery, sortBy]);

  const toggleBookmark = (id: string) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSearchSidebar}
      />

      {/* Sidebar panel */}
      <div
        id="search-sidebar"
        role="dialog"
        aria-label="검색"
        aria-hidden={!isOpen}
        className={`fixed top-0 left-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl border-r border-slate-200 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="홀로트립 로고" width={40} height={40} className="shrink-0" priority />
            <div>
              <span className="font-black text-lg tracking-tight text-slate-900">혼행 여지도</span>
              <p className="text-[10px] text-slate-400 font-medium">나를 만나는 혼자만의 여정</p>
            </div>
          </div>
          <button
            id="search-sidebar-close-btn"
            type="button"
            onClick={closeSearchSidebar}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Region tabs */}
          <div className="px-5 pt-4 flex gap-2">
            {(Object.keys(REGION_TOTALS) as PlaceRegion[]).map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => setSelectedRegion(region)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                  selectedRegion === region
                    ? "bg-sky-600 border-sky-600 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {region}
                <span className={`ml-1 ${selectedRegion === region ? "text-sky-100" : "text-slate-400"}`}>
                  {REGION_TOTALS[region]}
                </span>
              </button>
            ))}
          </div>

          {/* Search input */}
          <form onSubmit={handleSearchSubmit} className="px-5 pt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="search-sidebar-input"
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="가고 싶은 장소를 검색해보세요."
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClearQuery}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="검색어 지우기"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              id="search-sidebar-submit-btn"
              type="submit"
              className="shrink-0 w-10 flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-colors cursor-pointer"
              title="검색"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Category pills */}
          <div className="px-5 pt-3 flex gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedCategory(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === opt.value
                    ? "bg-sky-600 border-sky-600 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Solo-friendly toggle + age group dropdown */}
          <div className="px-5 pt-3 flex gap-2">
            <div className="flex-1 flex items-center justify-between gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-slate-800">혼밥 보장 식당</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={soloOnly}
                onClick={() => setSoloOnly((v) => !v)}
                className={`shrink-0 w-9 h-5 rounded-full border bg-white transition-colors cursor-pointer relative ${
                  soloOnly ? "border-sky-500" : "border-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-sm transition-all ${
                    soloOnly ? "translate-x-[14px] bg-sky-600" : "translate-x-0 bg-slate-300"
                  }`}
                />
              </button>
            </div>

            <div className="relative">
              <select
                id="search-sidebar-age-select"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as AgeGroupFilter)}
                className="h-full appearance-none pl-3 pr-7 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-none cursor-pointer hover:bg-slate-50"
              >
                {AGE_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    나이대 선호: {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Reference point + sort */}
          <div className="px-5 pt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              기준: {REFERENCE_POINT[selectedRegion]}
            </span>
            <div className="flex gap-1.5">
              {(["연관순위", "거리순"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSortBy(option)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer border ${
                    sortBy === option
                      ? "border-sky-300 bg-sky-50 text-sky-700"
                      : "border-transparent text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <div className="px-5 pt-4 pb-2 text-xs font-semibold text-slate-500">검색된 장소 {results.length}곳</div>

          {/* Place list */}
          <div className="px-5 pb-6 space-y-4">
            {results.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">검색된 장소가 없어요.</div>
            ) : (
              results.map((place) => (
                <div
                  key={place.id}
                  className="relative bg-white rounded-2xl border border-slate-200/80 p-3 flex gap-3 shadow-2xs hover:shadow-md transition-shadow"
                >
                  <div className="w-16 h-16 shrink-0 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-400">
                    {place.category === "음식점" ? (
                      <Utensils className="w-6 h-6" />
                    ) : place.category === "숙박" ? (
                      <BedDouble className="w-6 h-6" />
                    ) : (
                      <Landmark className="w-6 h-6" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate pr-6">{place.name}</h3>
                    <p className="text-xs text-slate-500">
                      <span className="text-amber-500 font-semibold">★ {place.rating.toFixed(2)}</span>
                      <span> (리뷰 {place.reviewCount}) · 도보 {place.walkMinutes}분</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleBookmark(place.id)}
                    className="absolute top-3 right-3 text-slate-300 hover:text-amber-400 cursor-pointer"
                    title="보관함에 저장"
                  >
                    <Star className={`w-4 h-4 ${bookmarked.has(place.id) ? "fill-amber-400 text-amber-400" : ""}`} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};
