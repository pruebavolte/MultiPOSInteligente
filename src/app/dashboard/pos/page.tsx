"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useProducts } from "@/hooks/use-products";
import { useCart } from "@/hooks/use-sales";
import { useCustomers } from "@/hooks/use-customers";
import { ElevenLabsVoiceAgent } from "@/components/menu-digital/elevenlabs-voice-agent";
import { CategoryBrowser } from "@/components/pos/category-browser";
import { Cart } from "@/components/pos/cart";
import { PaymentModal } from "@/components/pos/payment-modal";
import { VariantSelectionModal } from "@/components/pos/variant-selection-modal";
import { ReceiptViewer } from "@/components/pos/receipt-viewer";
import { Product } from "@/types/database";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, ShoppingCart, X, Grid3x3, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getProductWithVariants } from "@/lib/services/supabase";
import { supabase } from "@/lib/supabase/client";
import { useSearch } from "@/contexts/search-context";

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function POSPage() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<"products" | "voice">("products");
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const prevCartCountRef = useRef(0);

  const { 
    registerSearchHandler, 
    unregisterSearchHandler, 
    setSearchResult,
    showAddProductModal,
    setShowAddProductModal,
    setNewProductName,
    setNewProductBarcode,
    searchValue,
    setSearchValue,
  } = useSearch();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const { products: allProducts, loading: productsLoading } = useProducts();
  const menuProducts = allProducts;
  const { customers } = useCustomers({ active: true });
  const {
    cart,
    addItem,
    addItemWithVariants,
    removeItem,
    updateQuantity,
    updateItemDiscount,
    updateGlobalDiscount,
    clearCart,
    completeSale,
  } = useCart();

  // Generate next barcode based on product count
  const getNextBarcode = useCallback(() => {
    const maxId = allProducts.length > 0 
      ? Math.max(...allProducts.map(p => {
          const id = parseInt(p.id, 10);
          return isNaN(id) ? 0 : id;
        })) 
      : 0;
    return String(maxId + 1);
  }, [allProducts]);

  // Handle search (barcode or name search)
  const handleSearch = useCallback((query: string, isNumberSearch: boolean) => {
    if (isNumberSearch) {
      // Number search: search by barcode
      const product = allProducts.find(
        (p) => p.barcode === query || p.sku === query
      );

      if (product) {
        const category = categories.find((c) => c.id === product.category_id);
        addItem(product, 1);
        toast.success(`${product.name} agregado al carrito`);
        setSearchResult({
          found: true,
          type: "barcode",
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url || undefined,
            barcode: product.barcode || product.sku,
            category: category?.name || "Sin categoría",
            cost: product.cost,
          },
          searchedBarcode: query,
        });
      } else {
        // Barcode not found - open add product modal with barcode as name
        handleBarcodeNotFound(query);
      }
    } else {
      // Text search: open add product modal with name pre-filled
      const nextBarcode = getNextBarcode();
      setNewProductName(query);
      setNewProductBarcode(nextBarcode);
      setShowAddProductModal(true);
      setSearchValue(""); // Clear search bar
    }
  }, [allProducts, categories, addItem, setSearchResult, getNextBarcode, setNewProductName, setNewProductBarcode, setShowAddProductModal, setSearchValue]);

  // When barcode not found - open add product modal instead
  const handleBarcodeNotFound = useCallback((barcode: string) => {
    const nextBarcode = getNextBarcode();
    setNewProductName(barcode);
    setNewProductBarcode(nextBarcode);
    setShowAddProductModal(true);
    setSearchValue(""); // Clear search bar
  }, [allProducts, categories, addItem, setSearchResult, getNextBarcode, setNewProductName, setNewProductBarcode, setShowAddProductModal, setSearchValue]);

  // Register the search handler
  useEffect(() => {
    registerSearchHandler(handleSearch);
    return () => unregisterSearchHandler();
  }, [handleSearch, registerSearchHandler, unregisterSearchHandler]);

  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (cartItemCount > prevCartCountRef.current) {
      setCartBounce(true);
      const timer = setTimeout(() => setCartBounce(false), 500);
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = cartItemCount;
  }, [cartItemCount]);

  const handleVoiceAddToCart = (product: { id: string; name: string; description?: string; price: number; currency: string; image_url?: string; category_id?: string }) => {
    const fullProduct = allProducts.find(p => p.id === product.id);
    if (fullProduct) {
      addItem(fullProduct, 1);
    }
  };

  const handleVoicePlaceOrder = async () => {
    if (cart.items.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setPaymentModalOpen(true);
  };

  const voiceCartItems = cart.items.map(item => ({
    id: item.product.id,
    name: item.product.name,
    description: item.product.description || undefined,
    price: item.product.price,
    currency: "MXN",
    image_url: item.product.image_url || undefined,
    category_id: item.product.category_id || undefined,
    quantity: item.quantity,
  }));

  const voiceProducts = menuProducts.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || undefined,
    price: p.price,
    currency: "MXN",
    image_url: p.image_url || undefined,
    category_id: p.category_id || undefined,
  }));

  const handleSelectProduct = async (product: Product) => {
    if (product.has_variants) {
      const response = await getProductWithVariants(product.id);
      if (response.success && response.data && response.data.variants && response.data.variants.length > 0) {
        setSelectedProductForVariants(response.data);
        setVariantModalOpen(true);
        return;
      }
    }
    addItem(product, 1);
    toast.success(`${product.name} agregado`);
  };

  const handleVariantConfirm = (
    product: Product,
    selectedVariants: Array<{
      variant_id: string;
      variant_name: string;
      variant_type: string;
      price_applied: number;
    }>,
    quantity: number,
    totalPrice: number
  ) => {
    addItemWithVariants(product, selectedVariants, quantity, totalPrice);
    toast.success(`${product.name} agregado`);
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setPaymentModalOpen(true);
  };

  const handleCompleteSale = async (
    paymentMethod: string,
    customerId?: string,
    amountPaid?: number
  ) => {
    const result = await completeSale(paymentMethod, customerId);

    if (result.success) {
      toast.success("Venta completada", {
        description: `#${result.saleId}`,
      });

      if (paymentMethod === "cash" && amountPaid) {
        const change = amountPaid - cart.total;
        if (change > 0) {
          toast.info(`Cambio: $${change.toFixed(2)}`);
        }
      }

      if (result.saleId) {
        setLastSaleId(result.saleId);
        setReceiptViewerOpen(true);
      }
    } else {
      toast.error("Error al completar la venta", {
        description: result.error,
      });
      throw new Error(result.error);
    }
  };

  const filteredProducts = allProducts.filter(product => {
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesCategory;
  });

  // Get best sellers (top 6 products)
  const bestSellers = allProducts.slice(0, 6);

  const categoryCounts: { [key: string]: number } = {};
  allProducts.forEach((product) => {
    if (product.category_id) {
      categoryCounts[product.category_id] = (categoryCounts[product.category_id] || 0) + 1;
    }
  });

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Bar - Categories Combobox and Best Sellers */}
      <div className="flex-shrink-0 border-b bg-background px-4 py-3 space-y-2">
        {/* Categories Combobox and Best Sellers */}
        <div className="flex items-center gap-2">
          <div className="w-48">
            <Select value={selectedCategory || "all"} onValueChange={(val) => setSelectedCategory(val === "all" ? null : val)}>
              <SelectTrigger data-testid="select-categories">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-1">
                    <Grid3x3 className="h-3 w-3" />
                    <span>Todos</span>
                  </div>
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span>{category.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Best Sellers */}
          {bestSellers.length > 0 && (
            <div className="flex-1 flex items-center gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground flex-shrink-0">
                <TrendingUp className="h-3 w-3" />
                <span>Más vendidos:</span>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-1">
                  {bestSellers.map((product) => (
                    <Button
                      key={product.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectProduct(product)}
                      className="flex-shrink-0"
                      data-testid={`button-best-seller-${product.id}`}
                    >
                      {product.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <Button
            variant={activeView === "voice" ? "default" : "outline"}
            size="icon"
            onClick={() => setActiveView(activeView === "voice" ? "products" : "voice")}
            data-testid="button-toggle-voice"
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid lg:grid-cols-[1fr_380px] min-h-0">
        {/* Left Column - Products */}
        <div className="min-h-0 overflow-hidden">
          {activeView === "products" ? (
            <CategoryBrowser
              products={filteredProducts}
              onSelectProduct={handleSelectProduct}
              loading={productsLoading}
              hideCategories={true}
            />
          ) : (
            <div className="h-full p-4">
              <ElevenLabsVoiceAgent
                products={voiceProducts}
                onAddToCart={handleVoiceAddToCart}
                onPlaceOrder={handleVoicePlaceOrder}
                cart={voiceCartItems}
                language="es"
              />
            </div>
          )}
        </div>

        {/* Right Column - Cart (desktop) */}
        <div className="h-full hidden lg:block border-l">
          <Cart
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onUpdateItemDiscount={updateItemDiscount}
            onUpdateGlobalDiscount={updateGlobalDiscount}
            onClearCart={clearCart}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      {/* Floating Cart Button (mobile) */}
      <Button
        onClick={() => setCartSheetOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 lg:hidden",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          cartBounce && "animate-bounce"
        )}
        size="icon"
      >
        <ShoppingCart className="h-6 w-6" />
        {cartItemCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {cartItemCount > 99 ? "99+" : cartItemCount}
          </span>
        )}
      </Button>

      {/* Cart Sheet (mobile) */}
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 [&>button]:hidden">
          <SheetHeader className="p-3 border-b">
            <SheetTitle className="flex items-center justify-between">
              <span>Carrito</span>
              <Button variant="ghost" size="icon" onClick={() => setCartSheetOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-60px)] overflow-hidden">
            <Cart
              cart={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onUpdateItemDiscount={updateItemDiscount}
              onUpdateGlobalDiscount={updateGlobalDiscount}
              onClearCart={clearCart}
              onCheckout={() => {
                setCartSheetOpen(false);
                handleCheckout();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        total={cart.total}
        onComplete={handleCompleteSale}
        customers={customers}
      />

      {/* Variant Selection Modal */}
      <VariantSelectionModal
        open={variantModalOpen}
        onOpenChange={setVariantModalOpen}
        product={selectedProductForVariants}
        onConfirm={handleVariantConfirm}
      />

      {/* Receipt Viewer */}
      {lastSaleId && (
        <ReceiptViewer
          open={receiptViewerOpen}
          onOpenChange={setReceiptViewerOpen}
          saleId={lastSaleId}
        />
      )}
    </div>
  );
}
