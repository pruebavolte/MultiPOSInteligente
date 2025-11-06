import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Product } from "@shared/schema";

interface ProductSearchProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  language: string;
}

export function ProductSearch({ products, onProductSelect, language }: ProductSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  const texts = {
    es: {
      placeholder: "Buscar productos...",
      noResults: "No se encontraron productos",
    },
    en: {
      placeholder: "Search products...",
      noResults: "No products found",
    },
  };

  const t = texts[language as keyof typeof texts] || texts.en;

  useEffect(() => {
    if (searchQuery.length < 2) {
      setFilteredProducts([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products
      .filter(
        (p) =>
          p.active &&
          p.stock > 0 &&
          (p.name.toLowerCase().includes(query) ||
            p.sku.toLowerCase().includes(query) ||
            p.barcode?.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query))
      )
      .slice(0, 10);

    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const handleSelect = (product: Product) => {
    onProductSelect(product);
    setSearchQuery("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={t.placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOpen(true);
            }}
            className="h-12 pl-10 text-lg"
            data-testid="input-search-product"
          />
        </div>
      </PopoverTrigger>
      {searchQuery.length >= 2 && (
        <PopoverContent className="p-0 w-[400px]" align="start">
          <Command>
            <CommandList>
              <CommandEmpty>{t.noResults}</CommandEmpty>
              <CommandGroup>
                {filteredProducts.map((product) => (
                  <CommandItem
                    key={product.id}
                    onSelect={() => handleSelect(product)}
                    className="flex items-center justify-between py-3"
                    data-testid={`search-result-${product.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {product.sku} | Stock: {product.stock}
                      </p>
                    </div>
                    <p className="font-bold font-mono ml-4">
                      ${parseFloat(product.price).toFixed(2)}
                    </p>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}
