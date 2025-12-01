"use client";

import { useState, useEffect, useCallback } from "react";
import { Customer } from "@/types/database";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  CreditCard, 
  Banknote, 
  Send, 
  DollarSign, 
  Gift, 
  Clock,
  X,
  Delete,
  Mail,
  Calendar,
  Plus,
  Building2,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  method: string;
  methodName: string;
  amount: number;
}

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onComplete: (paymentMethod: string, customerId?: string, amountPaid?: number, payments?: Payment[]) => Promise<void>;
  customers?: Customer[];
  onPrintReceipt?: () => void;
}

const paymentMethods = [
  { id: "cash", name: "Efectivo", icon: Banknote, color: "bg-blue-500 text-white" },
  { id: "card", name: "Tarjeta", icon: CreditCard, color: "bg-white text-gray-700 border" },
  { id: "transfer", name: "Transferencia", icon: Send, color: "bg-white text-gray-700 border" },
  { id: "dollars", name: "Dólares", icon: DollarSign, color: "bg-white text-gray-700 border" },
  { id: "courtesy", name: "Cortesía", icon: Gift, color: "bg-white text-gray-700 border" },
  { id: "pending", name: "Pendiente", icon: Clock, color: "bg-white text-gray-700 border" },
];

const quickAmounts = [20, 50, 100, 200, 500];

export function PaymentModal({
  open,
  onOpenChange,
  total,
  onComplete,
  customers = [],
  onPrintReceipt,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("cash");
  const [customerId, setCustomerId] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("0.00");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = totalPaid > total ? totalPaid - total : 0;

  useEffect(() => {
    if (open) {
      setInputValue("0.00");
      setPayments([]);
      setSelectedMethod("cash");
      setCustomerId("");
    }
  }, [open]);

  const handleNumberClick = useCallback((num: string) => {
    setInputValue(prev => {
      if (prev === "0.00" || prev === "0") {
        return num === "." ? "0." : num;
      }
      if (num === "." && prev.includes(".")) return prev;
      if (prev.includes(".") && prev.split(".")[1]?.length >= 2) return prev;
      return prev + num;
    });
  }, []);

  const handleClear = useCallback(() => {
    setInputValue("0.00");
  }, []);

  const handleBackspace = useCallback(() => {
    setInputValue(prev => {
      if (prev.length <= 1 || prev === "0.00") return "0.00";
      const newValue = prev.slice(0, -1);
      return newValue || "0.00";
    });
  }, []);

  const handleQuickAmount = useCallback((amount: number) => {
    setInputValue(amount.toFixed(2));
  }, []);

  const handleAddPayment = useCallback(() => {
    const amount = parseFloat(inputValue) || 0;
    if (amount <= 0) return;

    const method = paymentMethods.find(m => m.id === selectedMethod);
    if (!method) return;

    const newPayment: Payment = {
      id: Date.now().toString(),
      method: selectedMethod,
      methodName: method.name,
      amount,
    };

    setPayments(prev => [...prev, newPayment]);
    setInputValue("0.00");
  }, [inputValue, selectedMethod]);

  const handleRemovePayment = useCallback((paymentId: string) => {
    setPayments(prev => prev.filter(p => p.id !== paymentId));
  }, []);

  const handleComplete = async () => {
    try {
      setLoading(true);
      
      if (payments.length === 0) {
        const amount = parseFloat(inputValue) || remaining;
        if (amount > 0) {
          const method = paymentMethods.find(m => m.id === selectedMethod);
          const finalPayments: Payment[] = [{
            id: Date.now().toString(),
            method: selectedMethod,
            methodName: method?.name || selectedMethod,
            amount,
          }];
          await onComplete(selectedMethod, customerId || undefined, amount, finalPayments);
        } else {
          await onComplete(selectedMethod, customerId || undefined, total, payments);
        }
      } else {
        const primaryMethod = payments[0]?.method || "cash";
        await onComplete(primaryMethod, customerId || undefined, totalPaid, payments);
      }
      
      onOpenChange(false);
      setPayments([]);
      setInputValue("0.00");
      setSelectedMethod("cash");
      setCustomerId("");
    } catch (error) {
      console.error("Error al completar pago:", error);
    } finally {
      setLoading(false);
    }
  };

  const canComplete = remaining <= 0 || (payments.length === 0 && parseFloat(inputValue) >= remaining);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-10 rounded-full p-1 hover:bg-gray-100 transition-colors"
          data-testid="button-close-payment"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={inputValue}
              readOnly
              className="flex-1 h-12 text-right text-2xl font-light border-gray-200 bg-gray-50"
              data-testid="input-payment-amount"
            />
            <span className="text-3xl font-light text-green-500">
              {parseFloat(inputValue).toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              return (
                <Button
                  key={method.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMethod(method.id)}
                  className={cn(
                    "h-9 text-xs font-medium transition-all",
                    isSelected 
                      ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600" 
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  )}
                  data-testid={`button-method-${method.id}`}
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {method.name}
                </Button>
              );
            })}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3].map(num => (
              <Button
                key={num}
                variant="outline"
                className="h-14 text-xl font-medium bg-white hover:bg-gray-50"
                onClick={() => handleNumberClick(num.toString())}
                data-testid={`button-num-${num}`}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="destructive"
              className="h-14 text-xl font-bold"
              onClick={handleClear}
              data-testid="button-clear"
            >
              C
            </Button>

            {[4, 5, 6].map(num => (
              <Button
                key={num}
                variant="outline"
                className="h-14 text-xl font-medium bg-white hover:bg-gray-50"
                onClick={() => handleNumberClick(num.toString())}
                data-testid={`button-num-${num}`}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-14 bg-white hover:bg-gray-50"
              onClick={handleBackspace}
              data-testid="button-backspace"
            >
              <Delete className="h-5 w-5" />
            </Button>

            {[7, 8, 9].map(num => (
              <Button
                key={num}
                variant="outline"
                className="h-14 text-xl font-medium bg-white hover:bg-gray-50"
                onClick={() => handleNumberClick(num.toString())}
                data-testid={`button-num-${num}`}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-14 bg-white hover:bg-gray-50"
              data-testid="button-calendar"
            >
              <Calendar className="h-5 w-5 text-gray-500" />
            </Button>

            <Button
              variant="outline"
              className="h-14 text-xl font-medium bg-white hover:bg-gray-50"
              onClick={() => handleNumberClick("00")}
              data-testid="button-num-00"
            >
              00
            </Button>
            <Button
              variant="outline"
              className="h-14 text-xl font-medium bg-white hover:bg-gray-50"
              onClick={() => handleNumberClick("0")}
              data-testid="button-num-0"
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-14 text-xl font-medium bg-white hover:bg-gray-50"
              onClick={() => handleNumberClick(".")}
              data-testid="button-decimal"
            >
              .
            </Button>
            <Button
              className="h-14 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handleAddPayment}
              data-testid="button-add-payment"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex gap-2">
            {quickAmounts.map(amount => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-sm font-medium border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={() => handleQuickAmount(amount)}
                data-testid={`button-quick-${amount}`}
              >
                ${amount}
              </Button>
            ))}
          </div>

          {payments.length > 0 ? (
            <ScrollArea className="h-20 border rounded-lg p-2">
              {payments.map(payment => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <span className="text-gray-600">{payment.methodName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${payment.amount.toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleRemovePayment(payment.id)}
                      data-testid={`button-remove-payment-${payment.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </ScrollArea>
          ) : (
            <p className="text-center text-sm text-gray-400 py-2">
              Aún no se han agregado pagos.
            </p>
          )}

          {(selectedMethod === "pending" || selectedMethod === "courtesy") && customers.length > 0 && (
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Seleccionar cliente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="bg-blue-50 p-4 space-y-2">
          <div className="text-center">
            <p className="text-sm text-blue-600 font-medium">Total a Pagar</p>
            <p className="text-3xl font-bold text-blue-600">${total.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-red-50 p-3">
          <div className="text-center">
            <p className="text-sm text-red-500 font-medium">Falta por Pagar</p>
            <p className="text-2xl font-bold text-red-500">${remaining.toFixed(2)}</p>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="px-4 py-2 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">Total Recibido</span>
            </div>
            <span className="font-bold text-gray-800">${totalPaid.toFixed(2)}</span>
          </div>
        )}

        {change > 0 && (
          <div className="px-4 py-2 bg-green-50 flex items-center justify-between">
            <span className="text-sm font-medium text-green-700">Cambio</span>
            <span className="font-bold text-green-700">${change.toFixed(2)}</span>
          </div>
        )}

        <div className="p-4 pt-2">
          <Button
            onClick={handleComplete}
            disabled={loading || (!canComplete && payments.length === 0)}
            className="w-full h-12 text-lg font-semibold bg-green-500 hover:bg-green-600 text-white"
            data-testid="button-complete-sale"
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-5 w-5" />
            )}
            Cobrar y Proceder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
