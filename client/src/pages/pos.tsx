import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ProductCard } from "@/components/pos/product-card";
import { CartItemComponent } from "@/components/pos/cart-item";
import { PaymentModal } from "@/components/pos/payment-modal";
import { ProductSearch } from "@/components/pos/product-search";
import { VoiceOrderButton } from "@/components/pos/voice-order-button";
import { LanguageSelector } from "@/components/language-selector";
import { CurrencySelector } from "@/components/currency-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Product, CartItem, LanguageCode, CurrencyCode, PaymentMethod } from "@shared/schema";

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [customerLanguage, setCustomerLanguage] = useState<LanguageCode>("es");
  const [customerCurrency, setCustomerCurrency] = useState<CurrencyCode>("MXN");
  const [cashierCurrency] = useState<CurrencyCode>("MXN");
  const [exchangeRate, setExchangeRate] = useState(1);
  const { toast } = useToast();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: config } = useQuery({
    queryKey: ["/api/config"],
  });

  // Fetch exchange rates when customer currency changes
  useEffect(() => {
    if (customerCurrency !== cashierCurrency) {
      fetch(`/api/exchange-rate?from=${cashierCurrency}&to=${customerCurrency}`)
        .then((res) => res.json())
        .then((data) => setExchangeRate(data.rate))
        .catch(() => setExchangeRate(1));
    } else {
      setExchangeRate(1);
    }
  }, [customerCurrency, cashierCurrency]);

  const addToCart = (product: Product, quantity: number = 1) => {
    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + quantity);
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product,
        quantity,
        subtotal: parseFloat(product.price) * quantity,
        discount: 0,
      };
      setCart([...cart, newItem]);
    }

    toast({
      title: customerLanguage === "es" ? "Producto agregado" : "Product added",
      description: `${product.name} × ${quantity}`,
    });
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: parseFloat(item.product.price) * newQuantity,
            }
          : item
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleVoiceCommand = async (transcription: string) => {
    try {
      const response = await fetch("/api/voice/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcription,
          language: customerLanguage,
          products,
        }),
      });

      const data = await response.json();

      if (data.command.type === "add" && data.product) {
        addToCart(data.product, data.command.quantity || 1);
      } else if (data.command.type === "remove" && data.product) {
        const item = cart.find((i) => i.product.id === data.product.id);
        if (item) removeFromCart(item.id);
      }
    } catch (error) {
      console.error("Error processing voice command:", error);
    }
  };

  const handleCompleteSale = async (paymentMethod: PaymentMethod, amountPaid: number) => {
    try {
      const saleData = {
        items: cart,
        paymentMethod,
        customerLanguage,
        customerCurrency,
        exchangeRate,
        amountPaid,
      };

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      });

      if (response.ok) {
        toast({
          title: customerLanguage === "es" ? "Venta completada" : "Sale completed",
          description: customerLanguage === "es" 
            ? "La venta se registró exitosamente" 
            : "Sale was registered successfully",
        });
        clearCart();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: customerLanguage === "es"
          ? "Error al procesar la venta"
          : "Error processing sale",
        variant: "destructive",
      });
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const customerTotal = total * exchangeRate;
  const currencySymbol = customerCurrency === "MXN" || customerCurrency === "USD" ? "$" : 
                         customerCurrency === "EUR" ? "€" : 
                         customerCurrency === "GBP" ? "£" : "¥";

  const texts = {
    es: {
      businessName: config?.businessName || "Sistema POS",
      cart: "Carrito",
      emptyCart: "El carrito está vacío",
      clearCart: "Limpiar",
      subtotal: "Subtotal",
      tax: "IVA (16%)",
      total: "Total",
      checkout: "Procesar Pago",
      customerView: "Vista Cliente",
      cashierView: "Vista Cajero",
    },
    en: {
      businessName: config?.businessName || "POS System",
      cart: "Cart",
      emptyCart: "Cart is empty",
      clearCart: "Clear",
      subtotal: "Subtotal",
      tax: "Tax (16%)",
      total: "Total",
      checkout: "Checkout",
      customerView: "Customer View",
      cashierView: "Cashier View",
    },
  };

  const t = texts[customerLanguage as keyof typeof texts] || texts.en;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-4 bg-card">
        <h1 className="text-2xl font-bold" data-testid="text-business-name">
          {t.businessName}
        </h1>
        <div className="flex items-center gap-2">
          <LanguageSelector
            currentLanguage={customerLanguage}
            onLanguageChange={setCustomerLanguage}
          />
          <CurrencySelector
            currentCurrency={customerCurrency}
            onCurrencyChange={setCustomerCurrency}
          />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products Grid */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <ProductSearch
              products={products}
              onProductSelect={(p) => addToCart(p)}
              language={customerLanguage}
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products
                .filter((p) => p.active && p.stock > 0)
                .map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={addToCart}
                    currency="$"
                  />
                ))}
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <div className="w-full lg:w-96 border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t.cart}
              </h2>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  data-testid="button-clear-cart"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t.clearCart}
                </Button>
              )}
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <Badge variant="secondary">{t.customerView}</Badge>
              <span className="font-mono">{customerCurrency}</span>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t.emptyCart}</p>
              </div>
            ) : (
              <div>
                {cart.map((item) => (
                  <CartItemComponent
                    key={item.id}
                    item={item}
                    currency={currencySymbol}
                    onQuantityChange={updateQuantity}
                    onRemove={removeFromCart}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t bg-muted/50 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t.subtotal}:</span>
                <span className="font-mono">{currencySymbol} {(subtotal * exchangeRate).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.tax}:</span>
                <span className="font-mono">{currencySymbol} {(tax * exchangeRate).toFixed(2)}</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold">
              <span>{t.total}:</span>
              <span className="font-mono text-2xl" data-testid="text-cart-total">
                {currencySymbol} {customerTotal.toFixed(2)}
              </span>
            </div>

            {exchangeRate !== 1 && (
              <div className="text-xs text-muted-foreground text-center">
                {t.cashierView}: $ {total.toFixed(2)} {cashierCurrency}
              </div>
            )}

            <Button
              className="w-full h-14 text-lg"
              disabled={cart.length === 0}
              onClick={() => setPaymentModalOpen(true)}
              data-testid="button-checkout"
            >
              {t.checkout}
            </Button>
          </div>
        </div>
      </div>

      <VoiceOrderButton
        onVoiceCommand={handleVoiceCommand}
        disabled={products.length === 0}
        language={customerLanguage}
      />

      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        total={total}
        currency={`$ ${cashierCurrency}`}
        onComplete={handleCompleteSale}
        language={customerLanguage}
      />
    </div>
  );
}
