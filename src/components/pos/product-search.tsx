"use client";

import { useState, useMemo } from "react";
import { Product } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package, Plus, Minimize2, Square, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type ImageSize = "small" | "medium" | "large";

interface ProductSearchProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  loading?: boolean;
}

export function ProductSearch({
  products,
  onSelectProduct,
  loading = false,
}: ProductSearchProps) {
  const [search, setSearch] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>("medium");

  // Image size configurations (same as digital menu)
  const imageSizeConfig = {
    small: {
      gridCols: "grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4",
      imageHeight: "h-32",
    },
    medium: {
      gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3",
      imageHeight: "h-48",
    },
    large: {
      gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2",
      imageHeight: "h-64",
    },
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) {
      return products.slice(0, 20); // Mostrar solo los primeros 20 por defecto
    }

    const searchLower = search.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.barcode?.toLowerCase().includes(searchLower)
    );
  }, [products, search]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Search Input and Size Controls */}
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
          />
        </div>

        {/* Image Size Controls */}
        <div className="flex gap-1 border rounded-lg p-1 bg-muted/30 flex-shrink-0">
          <Button
            variant={imageSize === "small" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setImageSize("small")}
            title="Pequeño"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant={imageSize === "medium" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setImageSize("medium")}
            title="Mediano"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={imageSize === "large" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setImageSize("large")}
            title="Grande"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      <ScrollArea className="flex-1 pr-4">
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
          <div className={cn("grid gap-6", imageSizeConfig[imageSize].gridCols)}>
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={cn(
                  "overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer",
                  product.stock <= product.min_stock &&
                    "border-orange-500"
                )}
                onClick={() => onSelectProduct(product)}
              >
                {/* Image */}
                <div className={cn("relative w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900", imageSizeConfig[imageSize].imageHeight)}>
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
                      <Package className="h-16 w-16" />
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
                    <span className={cn(
                      "font-medium",
                      product.stock <= product.min_stock ? "text-orange-600" : ""
                    )}>
                      Stock: {product.stock}
                    </span>
                  </div>

                  {/* Price Section */}
                  <div className="pt-2 border-t space-y-2">
                    {/* Primary Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-primary">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className="text-sm font-semibold text-primary/70">
                        MXN
                      </span>
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(product);
                      }}
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Search Summary */}
      {search && (
        <div className="text-sm text-muted-foreground text-center flex-shrink-0">
          {filteredProducts.length} producto(s) encontrado(s)
        </div>
      )}
    </div>
  );
}
