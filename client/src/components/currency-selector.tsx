import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@shared/schema";

interface CurrencySelectorProps {
  currentCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

export function CurrencySelector({ currentCurrency, onCurrencyChange }: CurrencySelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-currency-selector">
          <DollarSign className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(SUPPORTED_CURRENCIES).map(([code, { name, symbol }]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => onCurrencyChange(code as CurrencyCode)}
            className="flex items-center justify-between gap-4"
            data-testid={`option-currency-${code}`}
          >
            <span className={currentCurrency === code ? "font-semibold" : ""}>
              {code}
            </span>
            <span className="text-sm text-muted-foreground">
              {symbol} {name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
