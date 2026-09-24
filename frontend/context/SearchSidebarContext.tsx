"use client";

import React, { createContext, useContext, useState } from "react";
import { DbPlace, PlaceRegion, ReferenceSpot } from "@/lib/places";

interface SearchSidebarContextType {
  isOpen: boolean; // 사이드바가 화면에 보이는지 (false면 완전히 숨김)
  openSearchSidebar: () => void;
  closeSearchSidebar: () => void;

  isCollapsed: boolean; // isOpen이 true일 때, 얇게 접을지 여부
  toggleCollapsed: () => void;

  results: DbPlace[];
  setResults: (results: DbPlace[]) => void;
  referenceSpot: ReferenceSpot | null;
  setReferenceSpot: (spot: ReferenceSpot | null) => void;

  selectedRegion: PlaceRegion | null; // null = 지역 미선택(한반도 전체뷰)
  setSelectedRegion: (region: PlaceRegion | null) => void;

  selectedPlace: DbPlace | null; // 마커/사이드바 리스트 공통 상세카드용 (6·7단계에서 사용)
  setSelectedPlace: (place: DbPlace | null) => void;

  // "현 지도에서 검색" / "내 위치 주변" 버튼이 채우는 좌표+주소 라벨
  mapSearchRequest: { lat: number; lng: number; label: string } | null;
  setMapSearchRequest: (req: { lat: number; lng: number; label: string } | null) => void;
}

const SearchSidebarContext = createContext<SearchSidebarContextType | undefined>(undefined);

export const SearchSidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [results, setResults] = useState<DbPlace[]>([]);
  const [referenceSpot, setReferenceSpot] = useState<ReferenceSpot | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<PlaceRegion | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<DbPlace | null>(null);
  const [mapSearchRequest, setMapSearchRequest] = useState<{ lat: number; lng: number; label: string } | null>(
    null,
  );

  return (
    <SearchSidebarContext.Provider
      value={{
        isOpen,
        openSearchSidebar: () => {
          setIsOpen(true);
          setIsCollapsed(false);
        },
        closeSearchSidebar: () => {
          setIsOpen(false);
          setIsCollapsed(false);
        },
        isCollapsed,
        toggleCollapsed: () => setIsCollapsed((v) => !v),
        results,
        setResults,
        referenceSpot,
        setReferenceSpot,
        selectedRegion,
        setSelectedRegion,
        selectedPlace,
        setSelectedPlace,
        mapSearchRequest,
        setMapSearchRequest,
      }}
    >
      {children}
    </SearchSidebarContext.Provider>
  );
};

export const useSearchSidebar = () => {
  const context = useContext(SearchSidebarContext);
  if (!context) {
    throw new Error("useSearchSidebar must be used within a SearchSidebarProvider");
  }
  return context;
};