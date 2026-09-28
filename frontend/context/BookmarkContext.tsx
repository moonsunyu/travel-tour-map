// context/BookmarkContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { bookmarkClient } from "@/lib/bookmarkClient";
import { BookmarkItem } from "@/lib/types";
import { DbPlace, PlaceRegion, fetchRegionPlaces } from "@/lib/places";

interface BookmarkContextType {
  bookmarks: BookmarkItem[];
  bookmarksLoading: boolean;
  isBookmarked: (spotId: string) => boolean;
  toggleBookmark: (place: DbPlace, region: PlaceRegion) => Promise<void>;
  removeBookmark: (spotId: string) => Promise<void>;

  // 지도 위 북마크 마커 표시
  showBookmarkMarkers: boolean;
  setShowBookmarkMarkers: (value: boolean) => void;
  bookmarkPlaces: DbPlace[]; // 좌표가 확인된 북마크 장소들
  bookmarkPlacesLoading: boolean;

  // 북마크 목록/지도 마커 공통으로 쓰는 지역 필터
   bookmarkRegionFilter: "전체" | PlaceRegion;
   setBookmarkRegionFilter: (value: "전체" | PlaceRegion) => void;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  const [showBookmarkMarkers, setShowBookmarkMarkers] = useState(false);
  const [bookmarkPlaces, setBookmarkPlaces] = useState<DbPlace[]>([]);
  const [bookmarkPlacesLoading, setBookmarkPlacesLoading] = useState(false);
  const [bookmarkRegionFilter, setBookmarkRegionFilter] = useState<"전체" | PlaceRegion>("전체");
  const regionPlacesCacheRef = useRef<Map<PlaceRegion, DbPlace[]>>(new Map());

  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      setShowBookmarkMarkers(false);
      return;
    }
    setBookmarksLoading(true);
    bookmarkClient
      .list()
      .then((res) => {
        if (res.success && res.data) setBookmarks(res.data);
      })
      .finally(() => setBookmarksLoading(false));
  }, [user]);

  // 마커 표시가 켜져 있을 때만, 북마크 → 좌표가 있는 장소로 변환
  useEffect(() => {
    if (!showBookmarkMarkers || bookmarks.length === 0) {
      setBookmarkPlaces([]);
      return;
    }

    let cancelled = false;
    setBookmarkPlacesLoading(true);

    const regions = Array.from(new Set(bookmarks.map((b) => b.region as PlaceRegion)));
    Promise.all(
      regions.map(async (region) => {
        const cached = regionPlacesCacheRef.current.get(region);
        if (cached) return cached;
        const places = await fetchRegionPlaces(region);
        regionPlacesCacheRef.current.set(region, places);
        return places;
      }),
    )
      .then((lists) => {
        if (cancelled) return;
        const byId = new Map(lists.flat().map((p) => [p.id, p]));
        setBookmarkPlaces(
          bookmarks.map((b) => byId.get(b.spotId)).filter((p): p is DbPlace => !!p),
        );
      })
      .finally(() => {
        if (!cancelled) setBookmarkPlacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showBookmarkMarkers, bookmarks]);

  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((b) => b.spotId)), [bookmarks]);

  const isBookmarked = (spotId: string) => bookmarkedIds.has(spotId);


  const toggleBookmark = async (place: DbPlace, region: PlaceRegion) => {
    if (!user) return;

    const currentlyBookmarked = bookmarkedIds.has(place.id);

    if (currentlyBookmarked) {
      setBookmarks((prev) => prev.filter((b) => b.spotId !== place.id));
    } else {
      setBookmarks((prev) => [
        { spotId: place.id, spotName: place.name, category: place.category, region },
        ...prev,
      ]);
    }

    const res = currentlyBookmarked
      ? await bookmarkClient.remove(place.id)
      : await bookmarkClient.add({
          spotId: place.id,
          spotName: place.name,
          category: place.category,
          region,
        });

    if (!res.success) {
      if (currentlyBookmarked) {
        setBookmarks((prev) => [
          { spotId: place.id, spotName: place.name, category: place.category, region },
          ...prev,
        ]);
      } else {
        setBookmarks((prev) => prev.filter((b) => b.spotId !== place.id));
      }
    }
  };

  const removeBookmark = async (spotId: string) => {
    const removed = bookmarks.find((b) => b.spotId === spotId);
    setBookmarks((prev) => prev.filter((b) => b.spotId !== spotId));

    const res = await bookmarkClient.remove(spotId);
    if (!res.success && removed) {
      setBookmarks((prev) => [removed, ...prev]);
    }
  };

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        bookmarksLoading,
        isBookmarked,
        toggleBookmark,
        removeBookmark,
        showBookmarkMarkers,
        setShowBookmarkMarkers,
        bookmarkPlaces,
        bookmarkPlacesLoading,
        bookmarkRegionFilter,
        setBookmarkRegionFilter,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmark = () => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error("useBookmark must be used within a BookmarkProvider");
  }
  return context;
};