// context/BookmarkContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { bookmarkClient } from "@/lib/bookmarkClient";
import { BookmarkItem } from "@/lib/types";
import { DbPlace, PlaceRegion } from "@/lib/places";

interface BookmarkContextType {
  bookmarks: BookmarkItem[];
  bookmarksLoading: boolean;
  isBookmarked: (spotId: string) => boolean;
  toggleBookmark: (place: DbPlace, region: PlaceRegion) => Promise<void>;
  removeBookmark: (spotId: string) => Promise<void>;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setBookmarks([]);
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
      value={{ bookmarks, bookmarksLoading, isBookmarked, toggleBookmark, removeBookmark }}
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