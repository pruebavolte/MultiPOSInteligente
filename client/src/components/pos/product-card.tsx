import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  currency: string;
}

export function ProductCard({ product, onClick, currency }: ProductCardProps) {
  const isLowStock = product.stock <= product.minStock;
  const price = parseFloat(product.price);

  return (
    <Card
      className="p-4 cursor-pointer hover-elevate active-elevate-2 transition-shadow min-h-24"
      onClick={() => onClick(product)}
      data-testid={`card-product-${product.id}`}
    >
      <div className="flex flex-col h-full gap-3">
        {product.imageUrl ? (
          <div className="aspect-square rounded-md overflow-hidden bg-muted">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square rounded-md bg-muted flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium truncate" data-testid={`text-product-name-${product.id}`}>
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xl font-bold font-mono" data-testid={`text-price-${product.id}`}>
            {currency} {price.toFixed(2)}
          </p>
          {isLowStock && (
            <Badge variant="destructive" className="text-xs">
              Low Stock
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Stock: {product.stock} | SKU: {product.sku}
        </div>
      </div>
    </Card>
  );
}
