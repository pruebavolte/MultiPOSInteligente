"use client";

import { UserButton } from "@clerk/nextjs";
import Sidebar from "@/components/dashboard/sidebar";
import { UserSync } from "@/components/auth/user-sync";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search, X, Loader2 } from "lucide-react";
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
import { toast } from "sonner";

function SearchBar({ onCloseSidebar }: { onCloseSidebar?: () => void }) {
  const { 
    searchValue, 
    setSearchValue, 
    triggerSearch, 
    searchResult, 
    setSearchResult,
    showAddProductModal,
    setShowAddProductModal,
    newProductName,
    setNewProductName,
    newProductBarcode,
    setNewProductBarcode,
  } = useSearch();

  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (showAddProductModal) {
      setProductPrice("");
      setProductCost("");
    }
  }, [showAddProductModal]);

  const handleSaveProduct = async () => {
    if (!newProductName.trim() && !newProductBarcode.trim()) {
      toast.error("Debe ingresar al menos un nombre o código de barras");
      return;
    }
    if (!productPrice || parseFloat(productPrice) <= 0) {
      toast.error("Debe ingresar un precio válido");
      return;
    }

    setIsSaving(true);
    try {
      const productData = {
        name: newProductName.trim() || `Producto ${newProductBarcode}`,
        barcode: newProductBarcode.trim() || undefined,
        sku: newProductBarcode.trim() || `SKU-${Date.now()}`,
        price: parseFloat(productPrice),
        cost: productCost ? parseFloat(productCost) : 0,
        stock: 0,
        min_stock: 0,
        active: true,
        available_in_digital_menu: false,
        available_in_pos: true,
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar producto");
      }

      toast.success("Producto guardado exitosamente");
      setShowAddProductModal(false);
      setNewProductName("");
      setNewProductBarcode("");
      setProductPrice("");
      setProductCost("");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar producto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      triggerSearch();
    }
    // Close sidebar on any input
    if (onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    // Close sidebar on any input
    if (onCloseSidebar) {
      onCloseSidebar();
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
              onChange={handleChange}
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
              Complete los datos del nuevo producto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Nombre del Producto</p>
              <Input 
                value={newProductName} 
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Nombre del producto"
                data-testid="input-product-name"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Código de Barras</p>
              <Input 
                value={newProductBarcode} 
                onChange={(e) => setNewProductBarcode(e.target.value)}
                placeholder="Código de barras"
                className="font-mono"
                data-testid="input-product-barcode"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Precio de Venta</p>
              <Input 
                type="number" 
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                autoFocus
                data-testid="input-product-price"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Me Cuesta</p>
              <Input 
                type="number" 
                value={productCost}
                onChange={(e) => setProductCost(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                data-testid="input-product-cost"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowAddProductModal(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSaveProduct}
                disabled={isSaving}
                data-testid="button-add-product"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Agregar Producto"
                )}
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

            {showSearchBar && <SearchBar onCloseSidebar={() => setMobileMenuOpen(false)} />}

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
