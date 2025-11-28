"use client";

import { useState, useMemo, useEffect } from "react";
import { Product } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Package, ChefHat, Grid3x3, List } from "lucide-react";
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

export function CategoryBrowser({
  products,
  onSelectProduct,
  loading = false,
}: CategoryBrowserProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fetch categories
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

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) {
      return products;
    }
    return products.filter((product) => product.category_id === selectedCategory);
  }, [products, selectedCategory]);

  // Count products per category
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

  return (
    <div className="flex flex-col h-full gap-4">
      {/* View Mode Toggle */}
      <div className="flex justify-end gap-1 border rounded-lg p-1 bg-muted/30 w-fit ml-auto flex-shrink-0">
        <Button
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setViewMode("grid")}
          title="Vista de Cuadrícula"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setViewMode("list")}
          title="Vista de Lista"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Area with Categories and Products */}
      <ScrollArea className="flex-1 pr-4">
        {/* Category Filters */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Filtrar por Categoría
          </h3>
          <div className="flex flex-wrap gap-2">
            {/* All Products Button */}
            <button
              onClick={() => setSelectedCategory(null)}
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

            {/* Category Buttons */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
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
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={cn(
                  "overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer",
                  product.stock <= product.min_stock && "border-orange-500"
                )}
                onClick={() => onSelectProduct(product)}
              >
                {/* Image */}
                <div className="relative w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-gray-300">
                      <ChefHat className="h-16 w-16" />
                    </div>
                  )}

                  {/* Stock badge */}
                  {product.stock <= product.min_stock && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Stock Bajo
                    </div>
                  )}

                  {/* Product Name Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 pt-8">
                    <h3 className="font-bold text-lg text-white line-clamp-2 drop-shadow-lg">
                      {product.name}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-4 space-y-3">
                  {/* SKU and Stock */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>SKU: {product.sku}</span>
                    <span
                      className={cn(
                        "font-medium",
                        product.stock <= product.min_stock ? "text-orange-600" : ""
                      )}
                    >
                      Stock: {product.stock}
                    </span>
                  </div>

                  {/* Price Section */}
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-primary">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className="text-sm font-semibold text-primary/70">
                        MXN
                      </span>
                    </div>

                    {/* Add Button */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(product);
                      }}
                      size="sm"
                      className="w-full"
                    >
                      Agregar al Carrito
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={cn(
                  "cursor-pointer hover:bg-accent transition-colors",
                  product.stock <= product.min_stock && "border-l-4 border-l-orange-500"
                )}
                onClick={() => onSelectProduct(product)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Product Image */}
                    <div className="relative w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <ChefHat className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        SKU: {product.sku} | Stock: {product.stock}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-primary">
                        ${product.price.toFixed(2)}
                      </p>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(product);
                        }}
                        size="sm"
                        className="mt-1"
                      >
                        Agregar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
