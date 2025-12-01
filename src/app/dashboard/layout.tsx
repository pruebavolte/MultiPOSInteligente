"use client";

import { UserButton } from "@clerk/nextjs";
import Sidebar from "@/components/dashboard/sidebar";
import { UserSync } from "@/components/auth/user-sync";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { SearchProvider, useSearch } from "@/contexts/search-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package } from "lucide-react";
import Image from "next/image";

function SearchBar() {
  const { 
    searchValue, 
    setSearchValue, 
    triggerSearch, 
    searchResult, 
    setSearchResult,
    showAddProductModal,
    setShowAddProductModal,
    newProductName,
    newProductBarcode,
  } = useSearch();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      triggerSearch();
    }
  };

  return (
    <>
      <div className="flex-1 max-w-md">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar producto..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 h-9"
              data-testid="input-header-search"
            />
          </div>
          <Button size="sm" onClick={triggerSearch} data-testid="button-search">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Not Found Dialog - Barcode */}
      <Dialog open={searchResult !== null && !searchResult.found && searchResult?.type === "barcode"} onOpenChange={() => setSearchResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código de Barras No Encontrado</DialogTitle>
            <DialogDescription>
              No se encontró ningún producto con el código: <strong>{searchResult?.searchedBarcode}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                El código ingresado no está registrado en el sistema.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Found Dialog */}
      <Dialog open={searchResult !== null && searchResult.found} onOpenChange={() => setSearchResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Producto Encontrado</DialogTitle>
          </DialogHeader>
          {searchResult?.product && (
            <div className="flex flex-col gap-4 py-4">
              {/* Product Image */}
              <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center overflow-hidden relative mx-auto">
                {searchResult.product.image_url ? (
                  <Image
                    src={searchResult.product.image_url}
                    alt={searchResult.product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Package className="h-16 w-16 text-muted-foreground" />
                )}
              </div>

              {/* Product Details */}
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Nombre del Producto</p>
                  <h3 className="font-semibold text-lg">{searchResult.product.name}</h3>
                </div>

                {/* Barcode */}
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Código de Barras</p>
                  <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {searchResult.product.barcode}
                  </p>
                </div>

                {/* Category */}
                {searchResult.product.category && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Categoría</p>
                    <p className="text-sm">{searchResult.product.category}</p>
                  </div>
                )}

                {/* Price */}
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Precio de Venta Promedio</p>
                  <p className="text-2xl font-bold text-primary">
                    ${searchResult.product.price.toFixed(2)}
                  </p>
                </div>

                {/* Cost */}
                {searchResult.product.cost && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Costo</p>
                    <p className="text-sm text-muted-foreground">
                      ${searchResult.product.cost.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Product Modal - Text Search */}
      <Dialog open={showAddProductModal} onOpenChange={setShowAddProductModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Producto</DialogTitle>
            <DialogDescription>
              Nombre: <strong>{newProductName}</strong> | Código: <strong>{newProductBarcode}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Nombre del Producto</p>
              <Input value={newProductName} disabled className="bg-muted" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Código de Barras (Auto-generado)</p>
              <Input value={newProductBarcode} disabled className="bg-muted font-mono" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Precio de Venta</p>
              <Input 
                type="number" 
                placeholder="0.00"
                step="0.01"
                min="0"
                autoFocus
                data-testid="input-product-price"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowAddProductModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                data-testid="button-add-product"
              >
                Agregar Producto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const showSearchBar = pathname === "/dashboard/pos";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMainClick = () => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <UserSync />

      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuChange={setMobileMenuOpen}
      />

      <div
        className={`transition-all duration-300 ${
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
        onClick={handleMainClick}
      >
        <header className="sticky top-0 z-40 w-full border-b bg-background">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen(true);
                }}
                className="lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </Button>
              <img src="/images/logo_salvadorx.png" alt="Logo SalvadoreX" className="h-8" />
            </div>

            {showSearchBar && <SearchBar />}

            <div className="flex-1"></div>
            <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
              {isMounted && <UserButton afterSignOutUrl="/" />}
            </div>
          </div>
        </header>

        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SearchProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SearchProvider>
  );
}
