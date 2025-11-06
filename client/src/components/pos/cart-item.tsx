import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@shared/schema";

interface CartItemProps {
  item: CartItem;
  currency: string;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartItemComponent({ item, currency, onQuantityChange, onRemove }: CartItemProps) {
  const unitPrice = parseFloat(item.product.price);
  const subtotal = item.subtotal;

  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0"
      data-testid={`cart-item-${item.id}`}
    >
      <div className="flex-1 min-w-0 mr-4">
        <h4 className="text-base font-medium truncate" data-testid={`text-cart-product-${item.id}`}>
          {item.product.name}
        </h4>
        <p className="text-sm text-muted-foreground font-mono">
          {currency} {unitPrice.toFixed(2)} × {item.quantity}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10"
            onClick={() => onQuantityChange(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
            data-testid={`button-decrease-${item.id}`}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <span className="w-8 text-center font-medium" data-testid={`text-quantity-${item.id}`}>
            {item.quantity}
          </span>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10"
            onClick={() => onQuantityChange(item.id, item.quantity + 1)}
            disabled={item.quantity >= item.product.stock}
            data-testid={`button-increase-${item.id}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-24 text-right">
          <p className="text-lg font-bold font-mono" data-testid={`text-subtotal-${item.id}`}>
            {currency} {subtotal.toFixed(2)}
          </p>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemove(item.id)}
          data-testid={`button-remove-${item.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
