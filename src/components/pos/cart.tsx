"use client";

import { Cart as CartType, CartItem } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Plus, Minus, X, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface CartProps {
  cart: CartType;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onUpdateItemDiscount: (productId: string, discount: number) => void;
  onUpdateGlobalDiscount: (discount: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

export function Cart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemDiscount,
  onUpdateGlobalDiscount,
  onClearCart,
  onCheckout,
}: CartProps) {
  const isEmpty = cart.items.length === 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 space-y-0 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <CardTitle>Carrito</CardTitle>
            <span className="text-sm text-muted-foreground">
              ({cart.items.length})
            </span>
          </div>
          {!isEmpty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCart}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Carrito vacío</h3>
            <p className="text-sm text-muted-foreground">
              Agrega productos para comenzar una venta
            </p>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 py-4">
                {cart.items.map((item) => (
                  <CartItemComponent
                    key={item.product.id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemoveItem}
                    onUpdateDiscount={onUpdateItemDiscount}
                  />
                ))}
              </div>
            </ScrollArea>

            <div className="flex-shrink-0 border-t px-6 py-4 space-y-4">
              {/* Global Discount */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">
                  Descuento:
                </label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    defaultValue={0}
                    onChange={(e) =>
                      onUpdateGlobalDiscount(parseFloat(e.target.value) || 0)
                    }
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${cart.subtotal.toFixed(2)}</span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="font-medium text-green-600">
                      -${cart.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA (16%):</span>
                  <span className="font-medium">${cart.tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${cart.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={onCheckout}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                Proceder al Pago
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface CartItemComponentProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onUpdateDiscount: (productId: string, discount: number) => void;
}

function CartItemComponent({
  item,
  onUpdateQuantity,
  onRemove,
  onUpdateDiscount,
}: CartItemComponentProps) {
  const itemTotal =
    item.product.price * item.quantity * (1 - item.discount / 100);

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {/* Product Image */}
        <div className="relative w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0">
          {item.product.image_url ? (
            <Image
              src={item.product.image_url}
              alt={item.product.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <Package className="h-5 w-5 text-gray-400" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm leading-tight">
              {item.product.name}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => onRemove(item.product.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ${item.product.price.toFixed(2)} c/u
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Quantity Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))
            }
          >
            <Minus className="h-3 w-3" />
          </Button>
          <div className="w-12 text-center">
            <span className="font-medium">{item.quantity}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Item Discount */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            max="100"
            step="1"
            value={item.discount}
            onChange={(e) =>
              onUpdateDiscount(item.product.id, parseFloat(e.target.value) || 0)
            }
            className="w-16 h-8 text-xs text-center"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>

        {/* Item Total */}
        <div className="text-right">
          <p className="font-bold text-sm">${itemTotal.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
