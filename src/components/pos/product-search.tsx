"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Product } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type ImageSize = "small" | "medium" | "large";

interface ProductSearchProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  loading?: boolean;
}

function usePinchZoom(
  initialSize: ImageSize,
  onChange: (size: ImageSize) => void
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef<number | null>(null);
  const currentSize = useRef<ImageSize>(initialSize);

  const getDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current !== null) {
      const currentDistance = getDistance(e.touches);
      const ratio = currentDistance / initialDistance.current;

      // Threshold for changing size
      if (ratio > 1.3) {
        // Spread fingers = larger cards
        if (currentSize.current === "small") {
          currentSize.current = "medium";
          onChange("medium");
        } else if (currentSize.current === "medium") {
          currentSize.current = "large";
          onChange("large");
        }
        initialDistance.current = currentDistance;
      } else if (ratio < 0.7) {
        // Pinch fingers = smaller cards
        if (currentSize.current === "large") {
          currentSize.current = "medium";
          onChange("medium");
        } else if (currentSize.current === "medium") {
          currentSize.current = "small";
          onChange("small");
        }
        initialDistance.current = currentDistance;
      }
    }
  }, [onChange]);

  const handleTouchEnd = useCallback(() => {
    initialDistance.current = null;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Update ref when size changes externally
  useEffect(() => {
    currentSize.current = initialSize;
  }, [initialSize]);

  return containerRef;
}

export function ProductSearch({
  products,
  onSelectProduct,
  loading = false,
}: ProductSearchProps) {
  const [search, setSearch] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>("medium");

  // Pinch-to-zoom hook
  const pinchRef = usePinchZoom(imageSize, setImageSize);

  // Image size configurations
  const imageSizeConfig = {
    small: {
      gridCols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
      imageHeight: "h-24",
      cardPadding: "p-2",
      fontSize: "text-xs",
      priceSize: "text-lg",
    },
    medium: {
      gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3",
      imageHeight: "h-48",
      cardPadding: "p-4",
      fontSize: "text-sm",
      priceSize: "text-2xl",
    },
    large: {
      gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2",
      imageHeight: "h-64",
      cardPadding: "p-4",
      fontSize: "text-base",
      priceSize: "text-3xl",
    },
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) {
      return products.slice(0, 20);
    }

    const searchLower = search.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.barcode?.toLowerCase().includes(searchLower)
    );
  }, [products, search]);

  const config = imageSizeConfig[imageSize];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Search Input */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar productos por nombre, SKU o código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12"
            autoFocus
            data-testid="input-product-search"
          />
        </div>
      </div>

      {/* Pinch hint for touch devices */}
      <div className="text-xs text-muted-foreground text-center flex-shrink-0 sm:hidden">
        Usa dos dedos para hacer zoom (pellizcar para reducir, separar para ampliar)
      </div>

      {/* Products Grid with Pinch-to-Zoom */}
      <div ref={pinchRef} className="flex-1 min-h-0 touch-pan-y">
        <ScrollArea className="h-full pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-muted-foreground">Cargando productos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-2">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No se encontraron productos"
                  : "No hay productos disponibles"}
              </p>
            </div>
          ) : (
            <div className={cn("grid gap-4 transition-all duration-300", config.gridCols)}>
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  data-testid={`card-product-${product.id}`}
                  className={cn(
                    "overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer",
                    product.stock <= product.min_stock && "border-orange-500"
                  )}
                  onClick={() => onSelectProduct(product)}
                >
                  {/* Image */}
                  <div className={cn(
                    "relative w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 transition-all duration-300",
                    config.imageHeight
                  )}>
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-gray-300">
                        <Package className={cn(
                          "transition-all duration-300",
                          imageSize === "small" ? "h-8 w-8" : "h-16 w-16"
                        )} />
                      </div>
                    )}

                    {/* Stock badge */}
                    {product.stock <= product.min_stock && (
                      <div className={cn(
                        "absolute top-1 right-1 bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium",
                        imageSize === "small" ? "text-[10px]" : "text-xs"
                      )}>
                        Stock Bajo
                      </div>
                    )}

                    {/* Product Name Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 pt-6">
                      <h3 className={cn(
                        "font-bold text-white drop-shadow-lg transition-all duration-300",
                        imageSize === "small" ? "text-xs line-clamp-1" : "text-lg line-clamp-2"
                      )}>
                        {product.name}
                      </h3>
                    </div>
                  </div>

                  {/* Content */}
                  <CardContent className={cn("space-y-2 transition-all duration-300", config.cardPadding)}>
                    {/* SKU and Stock - Hidden on small size */}
                    {imageSize !== "small" && (
                      <div className={cn("flex items-center justify-between text-muted-foreground", config.fontSize)}>
                        <span>SKU: {product.sku}</span>
                        <span className={cn(
                          "font-medium",
                          product.stock <= product.min_stock ? "text-orange-600" : ""
                        )}>
                          Stock: {product.stock}
                        </span>
                      </div>
                    )}

                    {/* Price Section */}
                    <div className={cn(
                      "space-y-2",
                      imageSize !== "small" && "pt-2 border-t"
                    )}>
                      {/* Primary Price */}
                      <div className="flex items-baseline gap-1">
                        <span className={cn("font-black text-primary transition-all duration-300", config.priceSize)}>
                          ${product.price.toFixed(2)}
                        </span>
                        {imageSize !== "small" && (
                          <span className="text-sm font-semibold text-primary/70">
                            MXN
                          </span>
                        )}
                      </div>

                      {/* Add to Cart Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(product);
                        }}
                        size={imageSize === "small" ? "sm" : "default"}
                        className="w-full"
                        data-testid={`button-add-product-${product.id}`}
                      >
                        <Plus className={cn(
                          "mr-1",
                          imageSize === "small" ? "h-3 w-3" : "h-4 w-4"
                        )} />
                        {imageSize === "small" ? "+" : "Agregar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Search Summary */}
      {search && (
        <div className="text-sm text-muted-foreground text-center flex-shrink-0">
          {filteredProducts.length} producto(s) encontrado(s)
        </div>
      )}
    </div>
  );
}
