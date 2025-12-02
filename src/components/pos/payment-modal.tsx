"use client";

import { useState, useEffect, useCallback } from "react";
import { Customer } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  User,
  Delete,
  X,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onComplete: (paymentMethod: string, customerId?: string, amountPaid?: number) => Promise<void>;
  customers?: Customer[];
}

type PaymentMethod = "cash" | "card" | "transfer" | "credit";

const PAYMENT_METHODS = [
  { id: "cash" as PaymentMethod, name: "Efectivo", icon: Banknote, color: "bg-green-500" },
  { id: "card" as PaymentMethod, name: "Tarjeta", icon: CreditCard, color: "bg-blue-500" },
  { id: "transfer" as PaymentMethod, name: "Transferencia", icon: Smartphone, color: "bg-purple-500" },
  { id: "credit" as PaymentMethod, name: "Crédito", icon: User, color: "bg-amber-500" },
];

const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000];

const NUMPAD_KEYS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  [".", "0", "00"],
];

export function PaymentModal({
  open,
  onOpenChange,
  total,
  onComplete,
  customers = [],
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerId, setCustomerId] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const amountPaid = parseFloat(inputValue) || 0;
  const remaining = Math.max(0, total - amountPaid);
  const change = Math.max(0, amountPaid - total);
  const canComplete = paymentMethod !== "cash" || amountPaid >= total;

  useEffect(() => {
    if (open) {
      setInputValue("");
      setPaymentMethod("cash");
      setCustomerId("");
    }
  }, [open]);

  const handleNumpadPress = useCallback((key: string) => {
    setInputValue((prev) => {
      if (key === "." && prev.includes(".")) return prev;
      
      let candidate: string;
      if (key === "00" && prev === "") {
        candidate = "0";
      } else if (prev === "0" && key !== "." && key !== "00") {
        candidate = key;
      } else {
        candidate = prev + key;
      }
      
      const parts = candidate.split(".");
      if (parts.length === 2 && parts[1].length > 2) return prev;
      if (parts[0].length > 7) return prev;
      
      const numValue = parseFloat(candidate);
      if (isNaN(numValue) || numValue > 9999999.99) return prev;
      
      return candidate;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setInputValue((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setInputValue("");
  }, []);

  const handleQuickAmount = useCallback((amount: number) => {
    setInputValue(amount.toString());
  }, []);

  const handleExactAmount = useCallback(() => {
    setInputValue(total.toFixed(2));
  }, [total]);

  const handleComplete = async () => {
    if (!canComplete) return;
    
    try {
      setLoading(true);
      await onComplete(
        paymentMethod,
        customerId || undefined,
        paymentMethod === "cash" ? amountPaid : total
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Error al completar pago:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden" data-testid="payment-modal">
        <div className="flex flex-col md:flex-row h-[85vh] md:h-auto">
          <div className="flex-1 p-6 flex flex-col">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl">Procesar Pago</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-primary/10 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total a Pagar</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-total">
                  ${total.toFixed(2)}
                </p>
              </div>
              <div className={cn(
                "rounded-xl p-4 text-center transition-colors",
                remaining > 0 ? "bg-destructive/10" : "bg-green-500/10"
              )}>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {remaining > 0 ? "Falta por Pagar" : "Cambio"}
                </p>
                <p className={cn(
                  "text-3xl font-bold",
                  remaining > 0 ? "text-destructive" : "text-green-600"
                )} data-testid="text-remaining">
                  ${remaining > 0 ? remaining.toFixed(2) : change.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Método de Pago</p>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <Button
                      key={method.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "h-16 flex-col gap-1 transition-all",
                        isSelected && method.color
                      )}
                      onClick={() => setPaymentMethod(method.id)}
                      data-testid={`button-payment-${method.id}`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs">{method.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {paymentMethod === "credit" && customers.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Cliente</p>
                <ScrollArea className="h-32 rounded-lg border">
                  <div className="p-2 space-y-1">
                    {customers.map((customer) => (
                      <Button
                        key={customer.id}
                        variant={customerId === customer.id ? "secondary" : "ghost"}
                        className="w-full justify-start h-auto py-2"
                        onClick={() => setCustomerId(customer.id)}
                        data-testid={`button-customer-${customer.id}`}
                      >
                        <div className="text-left">
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Disponible: ${(customer.credit_limit - customer.credit_balance).toFixed(2)}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="mt-auto pt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                data-testid="button-cancel-payment"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                onClick={handleComplete}
                disabled={loading || !canComplete || (paymentMethod === "credit" && !customerId)}
                data-testid="button-complete-payment"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Completar Venta
              </Button>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden md:block" />
          <Separator className="md:hidden" />

          <div className="w-full md:w-80 bg-muted/30 p-4 flex flex-col">
            <div className="mb-4">
              <div className="bg-background rounded-xl p-4 text-center border-2 border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Monto Recibido</p>
                <p className="text-4xl font-bold font-mono" data-testid="text-amount-received">
                  ${inputValue || "0.00"}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Monto Rápido</p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="h-10 text-sm font-medium"
                    onClick={() => handleQuickAmount(amount)}
                    data-testid={`button-quick-${amount}`}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              <Button
                variant="secondary"
                className="w-full mt-2 h-10"
                onClick={handleExactAmount}
                data-testid="button-exact-amount"
              >
                Monto Exacto (${total.toFixed(2)})
              </Button>
            </div>

            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Teclado</p>
              <div className="grid grid-cols-3 gap-2">
                {NUMPAD_KEYS.flat().map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    className="h-12 text-lg font-medium"
                    onClick={() => handleNumpadPress(key)}
                    data-testid={`button-numpad-${key === "." ? "dot" : key}`}
                  >
                    {key}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={handleClear}
                  data-testid="button-numpad-clear"
                >
                  <X className="h-4 w-4 mr-1" />
                  Borrar
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={handleBackspace}
                  data-testid="button-numpad-backspace"
                >
                  <Delete className="h-4 w-4 mr-1" />
                  <span className="sr-only">Retroceso</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
