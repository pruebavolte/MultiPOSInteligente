import { useState } from "react";
import { CreditCard, Banknote, ArrowRightLeft, HandCoins } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PAYMENT_METHODS, type PaymentMethod } from "@shared/schema";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  currency: string;
  onComplete: (paymentMethod: PaymentMethod, amountPaid: number) => void;
  language: string;
}

const paymentIcons = {
  cash: Banknote,
  card: CreditCard,
  transfer: ArrowRightLeft,
  credit: HandCoins,
};

export function PaymentModal({
  open,
  onClose,
  total,
  currency,
  onComplete,
  language,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amountPaid, setAmountPaid] = useState(total.toString());

  const change = parseFloat(amountPaid) - total;
  const isValidPayment = parseFloat(amountPaid) >= total;

  const handleComplete = () => {
    if (selectedMethod && isValidPayment) {
      onComplete(selectedMethod, parseFloat(amountPaid));
      onClose();
    }
  };

  const texts = {
    es: {
      title: "Método de Pago",
      selectMethod: "Seleccione método de pago",
      amountPaid: "Cantidad recibida",
      change: "Cambio",
      complete: "Completar Venta",
      cancel: "Cancelar",
    },
    en: {
      title: "Payment Method",
      selectMethod: "Select payment method",
      amountPaid: "Amount paid",
      change: "Change",
      complete: "Complete Sale",
      cancel: "Cancel",
    },
  };

  const t = texts[language as keyof typeof texts] || texts.en;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label className="text-base mb-3 block">{t.selectMethod}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(PAYMENT_METHODS).map(([method, label]) => {
                const Icon = paymentIcons[method as PaymentMethod];
                const isSelected = selectedMethod === method;

                return (
                  <Button
                    key={method}
                    variant={isSelected ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => setSelectedMethod(method as PaymentMethod)}
                    data-testid={`button-payment-${method}`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm">{label.split(" / ")[language === "es" ? 0 : 1]}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {selectedMethod === "cash" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="amountPaid" className="text-base">
                  {t.amountPaid}
                </Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="h-14 text-3xl font-bold font-mono mt-2"
                  data-testid="input-amount-paid"
                />
              </div>

              {change >= 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <Label className="text-base">{t.change}</Label>
                  <p className="text-3xl font-bold font-mono mt-1" data-testid="text-change">
                    {currency} {change.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-card p-4 rounded-lg border">
            <Label className="text-lg">Total</Label>
            <p className="text-4xl font-bold font-mono mt-1" data-testid="text-total-payment">
              {currency} {total.toFixed(2)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-payment">
            {t.cancel}
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!selectedMethod || !isValidPayment}
            className="h-14 px-8 text-lg"
            data-testid="button-complete-sale"
          >
            {t.complete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
