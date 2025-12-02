"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Check } from "lucide-react";
import { CurrencyCode } from "@/contexts/language-context";
import { getCurrencySymbol } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface CurrencySelectorProps {
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  availableCurrencies?: CurrencyCode[];
  language?: string;
}

const CURRENCY_INFO: Record<CurrencyCode, { name: string; flag: string; nameEs: string }> = {
  MXN: { name: "Mexican Peso", nameEs: "Peso Mexicano", flag: "🇲🇽" },
  USD: { name: "US Dollar", nameEs: "Dólar Americano", flag: "🇺🇸" },
  BRL: { name: "Brazilian Real", nameEs: "Real Brasileño", flag: "🇧🇷" },
  EUR: { name: "Euro", nameEs: "Euro", flag: "🇪🇺" },
  JPY: { name: "Japanese Yen", nameEs: "Yen Japonés", flag: "🇯🇵" },
};

export function CurrencySelector({
  selectedCurrency,
  onCurrencyChange,
  availableCurrencies = ["MXN", "USD", "BRL", "EUR", "JPY"],
  language = "es",
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);

  const currentCurrencyInfo = CURRENCY_INFO[selectedCurrency];
  const currencySymbol = getCurrencySymbol(selectedCurrency);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-9 px-3 border-2 hover:border-primary transition-all"
        >
          <DollarSign className="h-4 w-4" />
          <span className="font-bold">{currencySymbol}</span>
          <span className="hidden sm:inline font-medium">{selectedCurrency}</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {currentCurrencyInfo.flag}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          {language === "es" ? "Seleccionar Divisa" : "Select Currency"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableCurrencies.map((currency) => {
          const info = CURRENCY_INFO[currency];
          const symbol = getCurrencySymbol(currency);
          const isSelected = currency === selectedCurrency;

          return (
            <DropdownMenuItem
              key={currency}
              onClick={() => {
                onCurrencyChange(currency);
                setOpen(false);
              }}
              className={cn(
                "cursor-pointer gap-3 py-2.5",
                isSelected && "bg-primary/10 font-semibold"
              )}
            >
              <span className="text-xl">{info.flag}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{symbol}</span>
                  <span className="font-medium">{currency}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === "es" ? info.nameEs : info.name}
                </p>
              </div>
              {isSelected && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook personalizado para manejar la divisa seleccionada con persistencia
export function useSelectedCurrency(defaultCurrency: CurrencyCode = "MXN") {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(defaultCurrency);

  // Cargar divisa desde localStorage al montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferred-currency");
      if (saved && ["MXN", "USD", "BRL", "EUR", "JPY"].includes(saved)) {
        setSelectedCurrency(saved as CurrencyCode);
      }
    }
  }, []);

  // Guardar divisa en localStorage cuando cambie
  const handleCurrencyChange = (currency: CurrencyCode) => {
    setSelectedCurrency(currency);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred-currency", currency);
    }
  };

  return {
    selectedCurrency,
    setSelectedCurrency: handleCurrencyChange,
  };
}
