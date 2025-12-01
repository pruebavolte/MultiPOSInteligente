"use client";

import { UserButton } from "@clerk/nextjs";
import Sidebar from "@/components/dashboard/sidebar";
import { UserSync } from "@/components/auth/user-sync";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search, X, Loader2, ChevronDown, ChevronUp, Grid3x3, TrendingUp, PanelLeft, ArrowUp, ArrowDown, Settings2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { SearchProvider, useSearch } from "@/contexts/search-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

interface Category {
  id: string;
  name: string;
}

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
    searchType,
    setSearchType,
    categoryPosition,
    setCategoryPosition,
    selectedCategory,
    setSelectedCategory,
  } = useSearch();

  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [productStock, setProductStock] = useState("");
  const [productMinStock, setProductMinStock] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCategory, setProductCategory] = useState<string>("");
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (showAddProductModal) {
      setProductPrice("");
      setProductCost("");
      setProductStock("");
      setProductMinStock("");
      setProductCategory("");
      setShowAdvanced(false);
      
      setTimeout(() => {
        if (searchType === "barcode") {
          nameInputRef.current?.focus();
        } else {
          priceInputRef.current?.focus();
        }
      }, 100);
    }
  }, [showAddProductModal, searchType]);

  const generateBarcode = () => {
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-13);
  };

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
      const finalBarcode = newProductBarcode.trim() || generateBarcode();
      const productData = {
        name: newProductName.trim() || `Producto ${finalBarcode}`,
        barcode: finalBarcode,
        sku: finalBarcode,
        price: parseFloat(productPrice),
        cost: productCost ? parseFloat(productCost) : 0,
        stock: productStock ? parseInt(productStock) : 0,
        min_stock: productMinStock ? parseInt(productMinStock) : 0,
        category_id: productCategory || null,
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
      setSearchType(null);
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
    if (onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    if (onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const handleModalInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef?: React.RefObject<HTMLInputElement | null>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      if (nextRef?.current) {
        e.preventDefault();
        nextRef.current.focus();
      }
    }
  };

  return (
    <>
      <div className="flex-1 flex items-center gap-2">
        <div className="relative flex gap-2 flex-1 max-w-md">
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

        <Select value={selectedCategory || "all"} onValueChange={(val) => setSelectedCategory(val === "all" ? null : val)}>
          <SelectTrigger className="w-40 h-9" data-testid="select-header-categories">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-1">
                <Grid3x3 className="h-3 w-3" />
                <span>Todos</span>
              </div>
            </SelectItem>
            <SelectItem value="best-sellers">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Más vendidos</span>
              </div>
            </SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9" data-testid="button-category-settings">
              <Settings2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => setCategoryPosition("left")}
              className="flex items-center gap-2"
            >
              <PanelLeft className="h-4 w-4" />
              Fijar categorías izquierda
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setCategoryPosition("top")}
              className="flex items-center gap-2"
            >
              <ArrowUp className="h-4 w-4" />
              Fijar categorías arriba
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setCategoryPosition("bottom")}
              className="flex items-center gap-2"
            >
              <ArrowDown className="h-4 w-4" />
              Fijar categorías abajo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setCategoryPosition("hidden")}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Ocultar categorías
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={searchResult !== null && searchResult.found} onOpenChange={() => setSearchResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Producto Encontrado</DialogTitle>
          </DialogHeader>
          {searchResult?.product && (
            <div className="flex flex-col gap-4 py-4">
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

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Nombre del Producto</p>
                  <h3 className="font-semibold text-lg">{searchResult.product.name}</h3>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Código de Barras</p>
                  <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {searchResult.product.barcode}
                  </p>
                </div>

                {searchResult.product.category && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Categoría</p>
                    <p className="text-sm">{searchResult.product.category}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Precio de Venta</p>
                  <p className="text-2xl font-bold text-primary">
                    ${searchResult.product.price.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                ref={nameInputRef}
                value={newProductName} 
                onChange={(e) => setNewProductName(e.target.value)}
                onKeyDown={(e) => handleModalInputKeyDown(e, barcodeInputRef)}
                placeholder="Nombre del producto"
                data-testid="input-product-name"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Código de Barras</p>
              <Input 
                ref={barcodeInputRef}
                value={newProductBarcode} 
                onChange={(e) => setNewProductBarcode(e.target.value)}
                onKeyDown={(e) => handleModalInputKeyDown(e, priceInputRef)}
                placeholder={searchType === "name" ? "Se generará automáticamente" : "Código de barras"}
                className="font-mono"
                data-testid="input-product-barcode"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Precio de Venta</p>
              <Input 
                ref={priceInputRef}
                type="number" 
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                data-testid="input-product-price"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between"
              data-testid="button-toggle-advanced"
            >
              <span>Avanzado</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showAdvanced && (
              <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Me Cuesta (Costo)</p>
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
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Categoría</p>
                  <Select value={productCategory} onValueChange={setProductCategory}>
                    <SelectTrigger data-testid="select-product-category">
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">Stock Inicial</p>
                    <Input 
                      type="number" 
                      value={productStock}
                      onChange={(e) => setProductStock(e.target.value)}
                      placeholder="0"
                      min="0"
                      data-testid="input-product-stock"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">Stock Mínimo</p>
                    <Input 
                      type="number" 
                      value={productMinStock}
                      onChange={(e) => setProductMinStock(e.target.value)}
                      placeholder="0"
                      min="0"
                      data-testid="input-product-min-stock"
                    />
                  </div>
                </div>
              </div>
            )}

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
