// components/search/SearchSidebar.tsx
"use client";

import { BedDouble, ChevronDown, Landmark, MapPin, Search, Star, Utensils, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSearchSidebar } from "@/context/SearchSidebarContext";
import { useAuth } from "@/context/AuthContext";
import { useBookmark } from "@/context/BookmarkContext";
import { haversineKm } from "@/lib/geo";
import {
  AgeGroupFilter,
  DbPlace,
  PlaceCategory,
  PlaceRegion,
  fetchRegionPlaces,
  fetchRegionTotals,
  searchAndGetResults,
  searchFromCoordinates,
} from "@/lib/places";

const CATEGORY_OPTIONS: { value: PlaceCategory | "전체"; label: string; icon?: React.ReactNode }[] = [
  { value: "전체", label: "전체" },
  { value: "음식점", label: "음식점", icon: <Utensils className="w-3.5 h-3.5" /> },
  { value: "관광명소", label: "관광명소", icon: <Landmark className="w-3.5 h-3.5" /> },
  { value: "숙박", label: "숙박", icon: <BedDouble className="w-3.5 h-3.5" /> },
];

const AGE_GROUP_OPTIONS: { value: AgeGroupFilter; label: string }[] = [
  { value: "선택 안함", label: "선택 안함" },
  { value: "20", label: "20대 인기" },
  { value: "30", label: "30대 인기" },
  { value: "40", label: "40대 인기" },
  { value: "50", label: "50대 인기" },
  { value: "60", label: "60대 인기" },
  { value: "전체", label: "전체 나이대" },
];

export const SearchSidebar: React.FC = () => {
  const {
    isOpen,
    closeSearchSidebar,
    results,
    setResults,
    referenceSpot,
    setReferenceSpot,
    selectedRegion,
    setSelectedRegion,
    mapSearchRequest,
    setMapSearchRequest,
    setSelectedPlace,
    selectedPlace,
    setMapFocusRequest,
    setPlacesLoading,
  } = useSearchSidebar();

  const { user, openAuthModal } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmark();

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | "전체">("전체");
  const [soloOnly, setSoloOnly] = useState(false);
  const [ageGroup, setAgeGroup] = useState<AgeGroupFilter>("선택 안함");
  const [sortBy, setSortBy] = useState<"거리순" | "연관순위">("거리순");
  const [searchNonce, setSearchNonce] = useState(0);
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [pool, setPool] = useState<DbPlace[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const [regionTotals, setRegionTotals] = useState<Record<PlaceRegion, number>>({
    강원도: 0,
    여수: 0,
  });

  const soloToggleDisabled = selectedCategory === "관광명소" || selectedCategory === "숙박";
  const ageDisabled = soloOnly || selectedCategory === "음식점" || selectedCategory === "숙박";

  const handleFullClose = () => {
    const hasActiveSearch = submittedQuery || mapSearchRequest;
    if (hasActiveSearch) {
      const confirmed = window.confirm("검색 내역이 초기화됩니다. 계속할까요?");
      if (!confirmed) return;
    }
    setQuery("");
    setSubmittedQuery("");
    setMapSearchRequest(null);
    setSelectedCategory("전체");
    setSoloOnly(false);
    setAgeGroup("선택 안함");
    setSortBy("거리순");
    closeSearchSidebar();
  };

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

  useEffect(() => {
    fetchRegionTotals().then(setRegionTotals);
  }, []);

  useEffect(() => {
    setPoolLoading(true);
    const task = selectedRegion
      ? fetchRegionPlaces(selectedRegion)
      : Promise.all([fetchRegionPlaces("강원도"), fetchRegionPlaces("여수")]).then(
        ([gangwon, yeosu]) => [...gangwon, ...yeosu],
      );
    task.then(setPool).finally(() => setPoolLoading(false));
  }, [selectedRegion]);

  useEffect(() => {
    if (soloToggleDisabled && soloOnly) setSoloOnly(false);
  }, [selectedCategory, soloToggleDisabled, soloOnly]);

  useEffect(() => {
    if (ageDisabled) setAgeGroup("선택 안함");
  }, [ageDisabled]);

  useEffect(() => {
    if (soloOnly && sortBy === "연관순위") setSortBy("거리순");
  }, [soloOnly, sortBy]);

  useEffect(() => {
    if (mapSearchRequest) {
      setQuery(mapSearchRequest.label);
      setSubmittedQuery("");
    }
  }, [mapSearchRequest]);

  useEffect(() => {
    setMapSearchRequest(null);
  }, [selectedRegion, setMapSearchRequest]);

  useEffect(() => {
    if (!selectedPlace) return;
    const el = document.getElementById(`place-item-${selectedPlace.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedPlace]);


  useEffect(() => {
    resultsScrollRef.current?.scrollTo({ top: 0 });
    setShowScrollTop(false);
  }, [results]);


  useEffect(() => {
    const el = resultsScrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setShowScrollTop(el.scrollTop > 200); // 200px 이상 내려가면 버튼 표시
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (pool.length === 0) {
      setResults([]);
      setReferenceSpot(null);
      return;
    }

    let cancelled = false;

    function applySingleModeResult(
      ref: { id: string; lat: number; lng: number },
      relatedPlaces: DbPlace[],
      soloRestaurants: DbPlace[],
      sortOrigin: { lat: number; lng: number },
    ): DbPlace[] {
      if (soloOnly) {
        return [...soloRestaurants].sort(
          (a, b) =>
            haversineKm(a.lat, a.lng, sortOrigin.lat, sortOrigin.lng) -
            haversineKm(b.lat, b.lng, sortOrigin.lat, sortOrigin.lng),
        );
      }

      let combined: DbPlace[];
      if (sortBy === "연관순위") {
        const soloSorted = [...soloRestaurants].sort(
          (a, b) =>
            haversineKm(a.lat, a.lng, sortOrigin.lat, sortOrigin.lng) -
            haversineKm(b.lat, b.lng, sortOrigin.lat, sortOrigin.lng),
        );
        combined = [...relatedPlaces, ...soloSorted];
      } else {
        combined = [...relatedPlaces, ...soloRestaurants].sort(
          (a, b) =>
            haversineKm(a.lat, a.lng, sortOrigin.lat, sortOrigin.lng) -
            haversineKm(b.lat, b.lng, sortOrigin.lat, sortOrigin.lng),
        );
      }

      let filtered = combined;
      if (selectedCategory === "음식점") filtered = combined.filter((p) => p.category === "음식점");
      else if (selectedCategory === "관광명소")
        filtered = combined.filter((p) => p.category !== "음식점" && p.category !== "숙박");
      else if (selectedCategory === "숙박") filtered = combined.filter((p) => p.category === "숙박");

      if (ageGroup !== "선택 안함") {
        filtered = filtered.filter((p) => p.ageGroups.includes(ageGroup));
      }

      const refCard = pool.find((p) => p.id === ref.id);
      if (refCard) {
        const categoryOk =
          selectedCategory === "전체" ||
          (selectedCategory === "관광명소"
            ? refCard.category !== "음식점" && refCard.category !== "숙박"
            : refCard.category === selectedCategory);
        const ageOk = ageGroup === "선택 안함" || refCard.ageGroups.includes(ageGroup);
        if (categoryOk && ageOk) {
          filtered = [refCard, ...filtered.filter((p) => p.id !== ref.id)];
        }
      }

      return filtered;
    }

    async function processSearch() {
      setSearching(true);

      if (mapSearchRequest && selectedRegion) {
        const result = await searchFromCoordinates(mapSearchRequest.lat, mapSearchRequest.lng, selectedRegion, pool);
        if (cancelled) return;

        if (result.mode !== "single") {
          setReferenceSpot(null);
          setResults([]);
          setSearching(false);
          return;
        }

        setReferenceSpot(result.referenceSpot);
        const filtered = applySingleModeResult(
          result.referenceSpot,
          result.relatedPlaces,
          result.soloRestaurants,
          { lat: mapSearchRequest.lat, lng: mapSearchRequest.lng },
        );
        if (!cancelled) {
          setResults(filtered);
          setSearching(false);
        }
        return;
      }

      if (!submittedQuery) {
        let filtered = pool;
        if (selectedCategory === "음식점") filtered = pool.filter((p) => p.category === "음식점");
        else if (selectedCategory === "관광명소")
          filtered = pool.filter((p) => p.category !== "음식점" && p.category !== "숙박");
        else if (selectedCategory === "숙박") filtered = pool.filter((p) => p.category === "숙박");

        if (soloOnly) filtered = pool.filter((p) => p.soloFriendly);
        if (ageGroup !== "선택 안함") filtered = filtered.filter((p) => p.ageGroups.includes(ageGroup));

        if (!cancelled) {
          setReferenceSpot(null);
          setResults(filtered);
          setSearching(false);
        }
        return;
      }

      if (!selectedRegion) {
        if (!cancelled) {
          setResults([]);
          setSearching(false);
        }
        return;
      }

      const result = await searchAndGetResults(submittedQuery, selectedRegion, pool);
      if (cancelled) return;

      if (result.mode === "empty") {
        setReferenceSpot(null);
        setResults([]);
        setSearching(false);
        return;
      }

      if (result.mode === "keyword") {
        setReferenceSpot(null);

        let filtered = result.matches;
        if (selectedCategory === "음식점") filtered = filtered.filter((p) => p.category === "음식점");
        else if (selectedCategory === "관광명소")
          filtered = filtered.filter((p) => p.category !== "음식점" && p.category !== "숙박");
        else if (selectedCategory === "숙박") filtered = filtered.filter((p) => p.category === "숙박");

        if (soloOnly) filtered = result.matches.filter((p) => p.soloFriendly);
        if (ageGroup !== "선택 안함") filtered = filtered.filter((p) => p.ageGroups.includes(ageGroup));

        if (!cancelled) {
          setResults(filtered);
          setSearching(false);
        }
        return;
      }

      const ref = result.referenceSpot;
      setReferenceSpot(ref);
      const filtered = applySingleModeResult(ref, result.relatedPlaces, result.soloRestaurants, ref);
      if (!cancelled) {
        setResults(filtered);
        setSearching(false);
      }
    }

    processSearch();
    return () => {
      cancelled = true;
    };
  }, [submittedQuery, searchNonce, pool, selectedRegion, selectedCategory, soloOnly, ageGroup, sortBy, mapSearchRequest]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mapSearchRequest && query.trim() === mapSearchRequest.label) {
      return;
    }
    setMapSearchRequest(null);
    setSubmittedQuery(query.trim());
    setSearchNonce((n) => n + 1);
  };

  const handleClearQuery = () => {
    setQuery("");
    setSubmittedQuery("");
    inputRef.current?.focus();
  };


  const isLoading = poolLoading || searching;

  useEffect(() => {
    setPlacesLoading(isLoading);
  }, [isLoading, setPlacesLoading]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        onClick={closeSearchSidebar}
      />

      <div
        id="search-sidebar"
        role="dialog"
        aria-label="검색"
        aria-hidden={!isOpen}
        className={`fixed top-0 left-0 z-50 h-full w-96 bg-white shadow-2xl border-r border-slate-200 flex flex-col transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="홀로트립 로고" width={40} height={40} className="shrink-0" priority />
              <div>
                <span className="font-black text-lg tracking-tight text-slate-900">혼행 여지도</span>
                <p className="text-[10px] text-slate-400 font-medium">나를 만나는 혼자만의 여정</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFullClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              aria-label="검색 닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="shrink-0">
              <div className="px-5 pt-4 flex gap-2">
                {(["강원도", "여수"] as PlaceRegion[]).map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setSelectedRegion(region)}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${selectedRegion === region
                      ? "bg-sky-600 border-sky-600 text-white"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    {region}
                    <span className={`ml-1 ${selectedRegion === region ? "text-sky-100" : "text-slate-400"}`}>
                      {regionTotals[region]}
                    </span>
                  </button>
                ))}
              </div>

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

              <div className="px-5 pt-3 flex gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedCategory(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${selectedCategory === opt.value
                      ? "bg-sky-600 border-sky-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className="px-5 pt-3 flex gap-2">
                <div
                  className={`flex-1 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${soloToggleDisabled ? "border-slate-100 bg-slate-50" : "border-sky-100 bg-sky-50"
                    }`}
                >
                  <div>
                    <p className={`text-xs font-semibold ${soloToggleDisabled ? "text-slate-400" : "text-slate-800"}`}>
                      혼밥 보장 식당
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={soloOnly}
                    disabled={soloToggleDisabled}
                    onClick={() => setSoloOnly((v) => !v)}
                    className={`shrink-0 w-9 h-5 rounded-full border bg-white transition-colors relative ${soloToggleDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                      } ${soloOnly ? "border-sky-500" : "border-slate-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-sm transition-all ${soloOnly ? "translate-x-[14px] bg-sky-600" : "translate-x-0 bg-slate-300"
                        }`}
                    />
                  </button>
                </div>

                <div className="relative">
                  <select
                    id="search-sidebar-age-select"
                    value={ageGroup}
                    disabled={ageDisabled}
                    onChange={(e) => setAgeGroup(e.target.value as AgeGroupFilter)}
                    className={`h-full appearance-none pl-3 pr-7 py-2 text-xs font-semibold border border-slate-200 rounded-xl outline-none bg-white ${ageDisabled ? "text-slate-300 cursor-not-allowed" : "text-slate-700 cursor-pointer hover:bg-slate-50"
                      }`}
                  >
                    {AGE_GROUP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        나이대 선호: {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={`w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${ageDisabled ? "text-slate-300" : "text-slate-400"
                      }`}
                  />
                </div>
              </div>

              <div className="px-5 pt-3 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  기준:{" "}
                  {referenceSpot?.name ??
                    (searching ? "검색 중" : submittedQuery ? "카테고리 검색 결과" : "전체 탐색 중")}
                </span>
                <div className="flex gap-1.5">
                  {(["연관순위", "거리순"] as const).map((option) => {
                    const optionDisabled = option === "연관순위" && soloOnly;
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={optionDisabled}
                        onClick={() => setSortBy(option)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-colors border ${optionDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                          } ${sortBy === option
                            ? "border-sky-300 bg-sky-50 text-sky-700"
                            : "border-transparent text-slate-500 hover:bg-slate-100"
                          }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-5 pt-4 pb-2 text-xs font-semibold text-slate-500">
                {isLoading ? (
                  "불러오는 중..."
                ) : (
                  <>
                    {`검색된 장소 ${results.length}곳`}
                    {ageGroup !== "선택 안함" && (
                      <span className="text-slate-400 font-normal"> 관광명소 전용 내용입니다 </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div ref={resultsScrollRef} className="flex-1 overflow-y-auto relative">
              <div className="px-5 pb-6 space-y-4">
                {isLoading ? (
                  <div className="py-12 text-center text-sm text-slate-400">장소를 불러오는 중입니다...</div>
                ) : results.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">검색된 장소가 없어요.</div>
                ) : (
                  results.map((place) => {
                    const distanceKm = referenceSpot
                      ? haversineKm(place.lat, place.lng, referenceSpot.lat, referenceSpot.lng)
                      : null;
                    const walkMinutes = distanceKm !== null ? Math.round((distanceKm / 4) * 60) : null;

                    const originDistanceKm = mapSearchRequest
                      ? haversineKm(place.lat, place.lng, mapSearchRequest.lat, mapSearchRequest.lng)
                      : null;
                    const originWalkMinutes =
                      originDistanceKm !== null ? Math.round((originDistanceKm / 4) * 60) : null;

                    return (
                      <div
                        key={place.id}
                        id={`place-item-${place.id}`}
                        onClick={() => {
                          setSelectedPlace(place);
                          setMapFocusRequest(place);
                          closeSearchSidebar();
                        }}
                        className={`relative bg-white rounded-2xl border p-3 flex gap-3 transition-all cursor-pointer ${selectedPlace?.id === place.id
                          ? "border-sky-400 ring-2 ring-sky-100 shadow-md"
                          : referenceSpot?.id === place.id
                            ? "border-slate-200/80 shadow-lg shadow-slate-300/50"
                            : "border-slate-200/80 shadow-2xs hover:shadow-md"
                          }`}
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
                            <span>{place.category}</span>
                            {walkMinutes !== null && <span> · 기준점에서 도보 약 {walkMinutes}분</span>}
                          </p>
                          {originWalkMinutes !== null && (
                            <p className="text-xs text-slate-400">검색 위치에서 도보 약 {originWalkMinutes}분</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              openAuthModal("login");
                              return;
                            }
                            toggleBookmark(place, selectedRegion ?? "강원도");
                          }}
                          className="absolute top-3 right-3 text-slate-300 hover:text-amber-400 cursor-pointer"
                          title="보관함에 저장"
                        >
                          <Star
                            className={`w-4 h-4 ${isBookmarked(place.id) ? "fill-amber-400 text-amber-400" : ""}`}
                          />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
        {showScrollTop && (
          <button
            type="button"
            onClick={() =>
              resultsScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
            }
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-0.5 bg-white text-slate-600 text-[10px] font-semibold w-30 h-10 rounded-full shadow-lg border border-slate-200 cursor-pointer hover:bg-slate-50"
          >
            <span className="text-sm">↑</span>
            <span>맨위로</span>
          </button>
        )}
      </div>
    </>
  );
};