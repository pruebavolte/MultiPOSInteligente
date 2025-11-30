"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Product } from "@/types/database";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Grid3x3 } from "lucide-react";
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
  selectedCategory?: string | null;
  onCategoryChange?: (categoryId: string | null) => void;
  hideCategories?: boolean;
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
  selectedCategory: externalSelectedCategory,
  onCategoryChange,
  hideCategories = false,
}: CategoryBrowserProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [localSelectedCategory, setLocalSelectedCategory] = useState<string | null>(null);
  const [cardSize, setCardSize] = useState<CardSize>("medium");
  const [loadingCategories, setLoadingCategories] = useState(true);

  const selectedCategory = externalSelectedCategory !== undefined ? externalSelectedCategory : localSelectedCategory;
  const setSelectedCategory = onCategoryChange || setLocalSelectedCategory;

  const pinchRef = usePinchZoom(cardSize, setCardSize);

  const cardSizeConfig = {
    small: {
      gridCols: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
      imageHeight: "aspect-square",
      fontSize: "text-xs",
    },
    medium: {
      gridCols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4",
      imageHeight: "aspect-square",
      fontSize: "text-sm",
    },
    large: {
      gridCols: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3",
      imageHeight: "aspect-square",
      fontSize: "text-base",
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
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  const config = cardSizeConfig[cardSize];

  return (
    <div className="flex flex-col h-full gap-2">
      {!hideCategories && (
        <div className="flex-shrink-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                data-testid="button-category-all"
                className={cn(
                  "px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 flex-shrink-0",
                  selectedCategory === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Grid3x3 className="h-3 w-3" />
                  <span>Todos</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    selectedCategory === null
                      ? "bg-primary-foreground/20"
                      : "bg-primary/10 text-primary"
                  )}>
                    {products.length}
                  </span>
                </div>
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`button-category-${category.id}`}
                  className={cn(
                    "px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 flex-shrink-0",
                    selectedCategory === category.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{category.name}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                      selectedCategory === category.id
                        ? "bg-primary-foreground/20"
                        : "bg-primary/10 text-primary"
                    )}>
                      {categoryCounts[category.id] || 0}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div ref={pinchRef} className="flex-1 min-h-0 touch-pan-y">
        <ScrollArea className="h-full">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-2">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No hay productos
              </p>
            </div>
          ) : (
            <div className={cn("grid gap-3 p-1 transition-all duration-300", config.gridCols)}>
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  data-testid={`card-category-product-${product.id}`}
                  className={cn(
                    "bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group",
                    "border border-gray-100 dark:border-gray-700",
                    product.stock <= product.min_stock && "ring-2 ring-orange-400"
                  )}
                  onClick={() => onSelectProduct(product)}
                >
                  <div className={cn(
                    "relative w-full bg-gray-50 dark:bg-gray-900",
                    config.imageHeight
                  )}>
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 20vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-gray-300">
                        <Package className="h-12 w-12" />
                      </div>
                    )}

                    {product.stock <= product.min_stock && (
                      <div className="absolute top-1 right-1 bg-orange-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                        Bajo
                      </div>
                    )}
                  </div>

                  <div className="p-2 text-center">
                    <h3 className={cn(
                      "font-medium text-foreground line-clamp-2 leading-tight mb-1",
                      config.fontSize
                    )}>
                      {product.name}
                    </h3>
                    <p className="text-primary font-bold text-sm">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
