"use client";

import { useState } from "react";
import { Customer } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, CreditCard, Banknote, Smartphone, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onComplete: (paymentMethod: string, customerId?: string, amountPaid?: number) => Promise<void>;
  customers?: Customer[];
}

export function PaymentModal({
  open,
  onOpenChange,
  total,
  onComplete,
  customers = [],
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [customerId, setCustomerId] = useState<string>("");
  const [amountPaid, setAmountPaid] = useState<string>(total.toFixed(2));
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    { id: "cash", name: "Efectivo", icon: Banknote },
    { id: "card", name: "Tarjeta", icon: CreditCard },
    { id: "transfer", name: "Transferencia", icon: Smartphone },
    { id: "credit", name: "Crédito", icon: User },
  ];

  const amountPaidNum = parseFloat(amountPaid) || 0;
  const change = amountPaidNum - total;

  const handleComplete = async () => {
    try {
      setLoading(true);
      await onComplete(
        paymentMethod,
        customerId || undefined,
        paymentMethod === "cash" ? amountPaidNum : undefined
      );
      onOpenChange(false);
      // Reset form
      setPaymentMethod("cash");
      setCustomerId("");
      setAmountPaid(total.toFixed(2));
    } catch (error) {
      console.error("Error al completar pago:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Procesar Pago</DialogTitle>
          <DialogDescription>
            Selecciona el método de pago y completa la venta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Total */}
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total a pagar</p>
            <p className="text-3xl font-bold text-primary">
              ${total.toFixed(2)}
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Método de Pago</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div key={method.id}>
                      <RadioGroupItem
                        value={method.id}
                        id={method.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={method.id}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-background p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                        )}
                      >
                        <Icon className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">{method.name}</span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Customer Selection (for credit) */}
          {paymentMethod === "credit" && (
            <div className="space-y-2">
              <Label htmlFor="customer">Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex flex-col">
                        <span>{customer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Crédito disponible: $
                          {(customer.credit_limit - customer.credit_balance).toFixed(
                            2
                          )}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cash Payment Details */}
          {paymentMethod === "cash" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="amount-paid">Monto Recibido</Label>
                <Input
                  id="amount-paid"
                  type="number"
                  step="0.01"
                  min={total}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="text-lg"
                />
              </div>

              {change >= 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cambio:</span>
                    <span
                      className={cn(
                        "text-2xl font-bold",
                        change > 0 ? "text-green-600" : "text-muted-foreground"
                      )}
                    >
                      ${change.toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              {change < 0 && (
                <p className="text-sm text-destructive">
                  El monto recibido debe ser mayor o igual al total
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleComplete}
            disabled={
              loading ||
              (paymentMethod === "cash" && change < 0) ||
              (paymentMethod === "credit" && !customerId)
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Completar Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
