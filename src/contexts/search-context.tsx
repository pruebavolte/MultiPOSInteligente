"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";

interface SearchResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    barcode?: string;
    category?: string;
    cost?: number;
  };
  searchedBarcode: string;
}

interface SearchContextType {
  searchValue: string;
  setSearchValue: (value: string) => void;
  searchResult: SearchResult | null;
  setSearchResult: (result: SearchResult | null) => void;
  triggerSearch: () => void;
  registerSearchHandler: (handler: (barcode: string) => void) => void;
  unregisterSearchHandler: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const searchHandlerRef = useRef<((barcode: string) => void) | null>(null);

  const registerSearchHandler = useCallback((handler: (barcode: string) => void) => {
    searchHandlerRef.current = handler;
  }, []);

  const unregisterSearchHandler = useCallback(() => {
    searchHandlerRef.current = null;
  }, []);

  const triggerSearch = useCallback(() => {
    if (searchValue.trim() && searchHandlerRef.current) {
      searchHandlerRef.current(searchValue.trim());
    }
  }, [searchValue]);

  return (
    <SearchContext.Provider
      value={{
        searchValue,
        setSearchValue,
        searchResult,
        setSearchResult,
        triggerSearch,
        registerSearchHandler,
        unregisterSearchHandler,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
