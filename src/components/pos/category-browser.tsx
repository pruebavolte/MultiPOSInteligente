"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Product } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Package, ChefHat, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
}

interface CategoryBrowserProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  loading?: boolean;
}

type CardSize = "small" | "medium" | "large";

function usePinchZoom(
  initialSize: CardSize,
  onChange: (size: CardSize) => void
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef<number | null>(null);
  const currentSize = useRef<CardSize>(initialSize);

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

      if (ratio > 1.3) {
        if (currentSize.current === "small") {
          currentSize.current = "medium";
          onChange("medium");
        } else if (currentSize.current === "medium") {
          currentSize.current = "large";
          onChange("large");
        }
        initialDistance.current = currentDistance;
      } else if (ratio < 0.7) {
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

  useEffect(() => {
    currentSize.current = initialSize;
  }, [initialSize]);

  return containerRef;
}

export function CategoryBrowser({
  products,
  onSelectProduct,
  loading = false,
}: CategoryBrowserProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cardSize, setCardSize] = useState<CardSize>("medium");
  const [loadingCategories, setLoadingCategories] = useState(true);

  const pinchRef = usePinchZoom(cardSize, setCardSize);

  const cardSizeConfig = {
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

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) {
      return products;
    }
    return products.filter((product) => product.category_id === selectedCategory);
  }, [products, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    products.forEach((product) => {
      if (product.category_id) {
        counts[product.category_id] = (counts[product.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  if (loading || loadingCategories) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Cargando categorías...</p>
      </div>
    );
  }

  const config = cardSizeConfig[cardSize];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Pinch hint for touch devices */}
      <div className="text-xs text-muted-foreground text-center flex-shrink-0 sm:hidden">
        Usa dos dedos para hacer zoom (pellizcar para reducir, separar para ampliar)
      </div>

      {/* Scrollable Area with Categories and Products */}
      <div ref={pinchRef} className="flex-1 min-h-0 touch-pan-y">
        <ScrollArea className="h-full pr-4">
          {/* Category Filters */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Filtrar por Categoría
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                data-testid="button-category-all"
                className={cn(
                  "group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                  "hover:scale-105 hover:shadow-md",
                  selectedCategory === null
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  <span>Todos</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold transition-colors",
                    selectedCategory === null
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}>
                    {products.length}
                  </span>
                </div>
                {selectedCategory === null && (
                  <div className="absolute inset-0 rounded-lg bg-primary opacity-20 blur-xl" />
                )}
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`button-category-${category.id}`}
                  className={cn(
                    "group relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                    "hover:scale-105 hover:shadow-md",
                    selectedCategory === category.id
                      ? "bg-primary text-primary-foreground shadow-lg scale-105"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{category.name}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold transition-colors",
                      selectedCategory === category.id
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    )}>
                      {categoryCounts[category.id] || 0}
                    </span>
                  </div>
                  {selectedCategory === category.id && (
                    <div className="absolute inset-0 rounded-lg bg-primary opacity-20 blur-xl" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {selectedCategory
                  ? `${filteredProducts.length} ${filteredProducts.length === 1 ? 'Producto' : 'Productos'} encontrados`
                  : `Mostrando ${filteredProducts.length} productos`
                }
              </span>
            </div>
          </div>

          {/* Products Display */}
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-2">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No hay productos en esta categoría
              </p>
            </div>
          ) : (
            <div className={cn("grid gap-4 transition-all duration-300", config.gridCols)}>
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  data-testid={`card-category-product-${product.id}`}
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
                        <ChefHat className={cn(
                          "transition-all duration-300",
                          cardSize === "small" ? "h-8 w-8" : "h-16 w-16"
                        )} />
                      </div>
                    )}

                    {/* Stock badge */}
                    {product.stock <= product.min_stock && (
                      <div className={cn(
                        "absolute top-1 right-1 bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium",
                        cardSize === "small" ? "text-[10px]" : "text-xs"
                      )}>
                        Stock Bajo
                      </div>
                    )}

                    {/* Product Name Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 pt-6">
                      <h3 className={cn(
                        "font-bold text-white drop-shadow-lg transition-all duration-300",
                        cardSize === "small" ? "text-xs line-clamp-1" : "text-lg line-clamp-2"
                      )}>
                        {product.name}
                      </h3>
                    </div>
                  </div>

                  {/* Content */}
                  <CardContent className={cn("space-y-2 transition-all duration-300", config.cardPadding)}>
                    {/* SKU and Stock - Hidden on small size */}
                    {cardSize !== "small" && (
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
                      cardSize !== "small" && "pt-2 border-t"
                    )}>
                      <div className="flex items-baseline gap-1">
                        <span className={cn("font-black text-primary transition-all duration-300", config.priceSize)}>
                          ${product.price.toFixed(2)}
                        </span>
                        {cardSize !== "small" && (
                          <span className="text-sm font-semibold text-primary/70">
                            MXN
                          </span>
                        )}
                      </div>

                      {/* Add Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(product);
                        }}
                        size={cardSize === "small" ? "sm" : "default"}
                        className="w-full"
                        data-testid={`button-add-category-product-${product.id}`}
                      >
                        {cardSize === "small" ? "+" : "Agregar al Carrito"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
