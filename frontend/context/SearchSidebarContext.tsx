"use client";

import React, { createContext, useContext, useState } from "react";

interface SearchSidebarContextType {
  isOpen: boolean;
  openSearchSidebar: () => void;
  closeSearchSidebar: () => void;
}

const SearchSidebarContext = createContext<SearchSidebarContextType | undefined>(undefined);

export const SearchSidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SearchSidebarContext.Provider
      value={{
        isOpen,
        openSearchSidebar: () => setIsOpen(true),
        closeSearchSidebar: () => setIsOpen(false),
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
