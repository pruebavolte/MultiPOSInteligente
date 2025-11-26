"use client";

import { useState, useEffect, useRef } from "react";
import { useProducts } from "@/hooks/use-products";
import { useCart } from "@/hooks/use-sales";
import { useCustomers } from "@/hooks/use-customers";
import { ElevenLabsVoiceAgent } from "@/components/menu-digital/elevenlabs-voice-agent";
import { ProductSearch } from "@/components/pos/product-search";
import { Cart } from "@/components/pos/cart";
import { PaymentModal } from "@/components/pos/payment-modal";
import { VariantSelectionModal } from "@/components/pos/variant-selection-modal";
import { Product } from "@/types/database";
import { CartItemVariant } from "@/types/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Mic, Search, ShoppingCart, X, Star, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { getProductWithVariants } from "@/lib/services/supabase";

export default function POSPage() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("search");
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [loadingBestSellers, setLoadingBestSellers] = useState(true);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);
  const prevCartCountRef = useRef(0);

  // Fetch best sellers
  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        const response = await fetch('/api/best-sellers');
        const data = await response.json();
        if (response.ok) {
          setBestSellers(data.products || []);
        }
      } catch (error) {
        console.error('Error fetching best sellers:', error);
      } finally {
        setLoadingBestSellers(false);
      }
    };
    fetchBestSellers();
  }, []);

  // Hooks
  // Load menu_digital products for voice ordering
  const { products: menuProducts, loading: productsLoading } = useProducts({ active: true, product_type: "menu_digital" });
  // Also load inventory products for search
  const { products: inventoryProducts } = useProducts({ active: true, product_type: "inventory" });
  // Combine both for search, use menu products for voice
  const allProducts = [...menuProducts, ...inventoryProducts];
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

  // Calculate total items in cart
  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  // Detect when items are added to cart and trigger bounce animation
  useEffect(() => {
    if (cartItemCount > prevCartCountRef.current) {
      setCartBounce(true);
      const timer = setTimeout(() => setCartBounce(false), 500);
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = cartItemCount;
  }, [cartItemCount]);

  // Handler for ElevenLabs voice agent - add to cart
  const handleVoiceAddToCart = (product: { id: string; name: string; description?: string; price: number; currency: string; image_url?: string; category_id?: string }) => {
    // Find the full product from our products list
    const fullProduct = allProducts.find(p => p.id === product.id);
    if (fullProduct) {
      addItem(fullProduct, 1);
    }
  };

  // Handler for placing order via voice
  const handleVoicePlaceOrder = async () => {
    if (cart.items.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setPaymentModalOpen(true);
  };

  // Convert cart items to the format expected by ElevenLabsVoiceAgent
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

  // Convert menu products to the format expected by ElevenLabsVoiceAgent
  const voiceProducts = menuProducts.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || undefined,
    price: p.price,
    currency: "MXN",
    image_url: p.image_url || undefined,
    category_id: p.category_id || undefined,
  }));

  // Handler for product selection
  const handleSelectProduct = async (product: Product) => {
    // Check if product has variants
    if (product.has_variants) {
      // Fetch product with variants
      const response = await getProductWithVariants(product.id);
      if (response.success && response.data && response.data.variants && response.data.variants.length > 0) {
        setSelectedProductForVariants(response.data);
        setVariantModalOpen(true);
        return;
      }
    }
    // No variants, add directly
    addItem(product, 1);
    toast.success(`${product.name} agregado al carrito`);
  };

  // Handler for variant selection confirmation
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
    toast.success(`${product.name} agregado al carrito`);
  };

  // Handler for checkout
  const handleCheckout = () => {
    if (cart.items.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setPaymentModalOpen(true);
  };

  // Handler for completing sale
  const handleCompleteSale = async (
    paymentMethod: string,
    customerId?: string,
    amountPaid?: number
  ) => {
    const result = await completeSale(paymentMethod, customerId);

    if (result.success) {
      toast.success("¡Venta completada exitosamente!", {
        description: `Número de venta: ${result.saleId}`,
      });

      // Si es efectivo, mostrar el cambio
      if (paymentMethod === "cash" && amountPaid) {
        const change = amountPaid - cart.total;
        if (change > 0) {
          toast.info(`Cambio: $${change.toFixed(2)}`);
        }
      }
    } else {
      toast.error("Error al completar la venta", {
        description: result.error,
      });
      throw new Error(result.error);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col gap-6 h-full">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Punto de Venta
          </h1>
          <p className="text-muted-foreground">
            Sistema de ventas con órdenes por voz inteligente
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid lg:grid-cols-[1fr_450px] gap-6 min-h-0">
          {/* Left Column - Product Selection */}
          <div className="flex flex-col gap-4 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="search" className="gap-2">
                  <Search className="h-4 w-4" />
                  Buscar
                </TabsTrigger>
                <TabsTrigger value="best-sellers" className="gap-2">
                  <Star className="h-4 w-4" />
                  Más Vendidos
                </TabsTrigger>
                <TabsTrigger value="voice" className="gap-2">
                  <Mic className="h-4 w-4" />
                  Voz
                </TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="flex-1 mt-4">
                <ProductSearch
                  products={allProducts}
                  onSelectProduct={handleSelectProduct}
                  loading={productsLoading}
                />
              </TabsContent>

              <TabsContent value="best-sellers" className="flex-1 mt-4">
                <Card className="h-full">
                  <CardContent className="p-4 h-full">
                    <ScrollArea className="h-[calc(100vh-320px)]">
                      {loadingBestSellers ? (
                        <div className="flex items-center justify-center h-40">
                          <p className="text-muted-foreground">Cargando más vendidos...</p>
                        </div>
                      ) : bestSellers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                          <Star className="h-12 w-12 text-muted-foreground" />
                          <p className="text-muted-foreground text-center">
                            No hay productos más vendidos aún
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {bestSellers.map((product, index) => (
                            <div
                              key={product.id}
                              onClick={() => handleSelectProduct(product)}
                              className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors group"
                            >
                              {/* Rank Badge */}
                              <div className="flex-shrink-0">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center p-0 font-bold",
                                    index < 3 && "bg-yellow-500/90 text-white hover:bg-yellow-500"
                                  )}
                                >
                                  {index + 1}
                                </Badge>
                              </div>

                              {/* Product Image */}
                              <div className="relative w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0">
                                {product.image_url ? (
                                  <Image
                                    src={product.image_url}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center w-full h-full">
                                    <ChefHat className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                  {product.name}
                                </p>
                                <p className="text-sm font-bold text-primary">
                                  ${product.price.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="voice" className="mt-4 h-[600px]">
                <ElevenLabsVoiceAgent
                  products={voiceProducts}
                  onAddToCart={handleVoiceAddToCart}
                  onPlaceOrder={handleVoicePlaceOrder}
                  cart={voiceCartItems}
                  language="es"
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Cart (always visible on desktop) */}
          <div className="h-full hidden lg:block">
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
      </div>

      {/* Floating Cart Button - Only visible on mobile (cart is always visible on desktop) */}
      <Button
        onClick={() => setCartSheetOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 lg:hidden",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          cartBounce && "animate-bounce"
        )}
        size="icon"
      >
        <ShoppingCart className="h-7 w-7" />
        {cartItemCount > 0 && (
          <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {cartItemCount > 99 ? "99+" : cartItemCount}
          </span>
        )}
      </Button>

      {/* Cart Sheet - Slides from right */}
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[450px] p-0 [&>button]:hidden">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              <span>Carrito</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCartSheetOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-80px)] overflow-hidden">
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
    </div>
  );
}
