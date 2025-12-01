"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";

interface SearchResult {
  found: boolean;
  type?: "barcode" | "name_search"; // Type of search
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
  registerSearchHandler: (handler: (query: string, isNumberSearch: boolean) => void) => void;
  unregisterSearchHandler: () => void;
  showAddProductModal: boolean;
  setShowAddProductModal: (show: boolean) => void;
  newProductName: string;
  setNewProductName: (name: string) => void;
  newProductBarcode: string;
  setNewProductBarcode: (barcode: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const searchHandlerRef = useRef<((query: string, isNumberSearch: boolean) => void) | null>(null);

  const registerSearchHandler = useCallback((handler: (query: string, isNumberSearch: boolean) => void) => {
    searchHandlerRef.current = handler;
  }, []);

  const unregisterSearchHandler = useCallback(() => {
    searchHandlerRef.current = null;
  }, []);

  const triggerSearch = useCallback(() => {
    if (searchValue.trim() && searchHandlerRef.current) {
      // Check if search is numeric (number search) or text (name search)
      const isNumberSearch = /^\d+$/.test(searchValue.trim());
      searchHandlerRef.current(searchValue.trim(), isNumberSearch);
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
        showAddProductModal,
        setShowAddProductModal,
        newProductName,
        setNewProductName,
        newProductBarcode,
        setNewProductBarcode,
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
