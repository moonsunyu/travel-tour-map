"use client";

import React, { createContext, useContext, useState } from "react";
import { DbPlace, PlaceRegion, ReferenceSpot } from "@/lib/places";

interface SearchSidebarContextType {
  isOpen: boolean;
  openSearchSidebar: () => void;
  closeSearchSidebar: () => void; // 소프트 닫기 — 검색 상태 유지

  results: DbPlace[];
  setResults: (results: DbPlace[]) => void;
  referenceSpot: ReferenceSpot | null;
  setReferenceSpot: (spot: ReferenceSpot | null) => void;

  selectedRegion: PlaceRegion | null;
  setSelectedRegion: (region: PlaceRegion | null) => void;

  selectedPlace: DbPlace | null;
  setSelectedPlace: (place: DbPlace | null) => void;

  // 사이드바 리스트 클릭 시에만 지도 이동을 트리거 (마커 클릭과 구분)
  mapFocusRequest: DbPlace | null;
  setMapFocusRequest: (place: DbPlace | null) => void;

  mapSearchRequest: { lat: number; lng: number; label: string } | null;
  setMapSearchRequest: (req: { lat: number; lng: number; label: string } | null) => void;
  

  placesLoading: boolean;
  setPlacesLoading: (loading: boolean) => void;
}

const SearchSidebarContext = createContext<SearchSidebarContextType | undefined>(undefined);

export const SearchSidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<DbPlace[]>([]);
  const [referenceSpot, setReferenceSpot] = useState<ReferenceSpot | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<PlaceRegion | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<DbPlace | null>(null);
  const [mapFocusRequest, setMapFocusRequest] = useState<DbPlace | null>(null);
  const [mapSearchRequest, setMapSearchRequest] = useState<{ lat: number; lng: number; label: string } | null>(
    null,
  );
  const [placesLoading, setPlacesLoading] = useState(true);

  return (
    <SearchSidebarContext.Provider
      value={{
        isOpen,
        openSearchSidebar: () => setIsOpen(true),
        closeSearchSidebar: () => setIsOpen(false),
        results,
        setResults,
        referenceSpot,
        setReferenceSpot,
        selectedRegion,
        setSelectedRegion,
        selectedPlace,
        setSelectedPlace,
        mapFocusRequest,
        setMapFocusRequest,
        mapSearchRequest,
        setMapSearchRequest,
        placesLoading,
        setPlacesLoading,
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