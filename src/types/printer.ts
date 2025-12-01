export type PrinterConnection = "usb" | "network" | "bluetooth" | "email";
export type PrinterWidth = "58mm" | "80mm";

export interface PrinterConfig {
  id: string;
  name: string;
  connection: PrinterConnection;
  width: PrinterWidth;
  ipAddress?: string;
  port?: number;
  macAddress?: string;
  emailAddress?: string;
  isDefault: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptData {
  saleId: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessRFC?: string;
  date: string;
  time: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payments: ReceiptPayment[];
  change: number;
  cashierName?: string;
  customerName?: string;
  ticketNumber: string;
  footerMessage?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variants?: string[];
}

export interface ReceiptPayment {
  method: string;
  amount: number;
}

export interface DeliveryPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  apiKey?: string;
  storeId?: string;
  isConnected: boolean;
  webhookUrl?: string;
  enabled: boolean;
}

export const DELIVERY_PLATFORMS: Omit<DeliveryPlatform, 'apiKey' | 'storeId' | 'isConnected' | 'webhookUrl' | 'enabled'>[] = [
  { id: "uber_eats", name: "Uber Eats", icon: "uber", color: "#06C167" },
  { id: "didi_food", name: "Didi Food", icon: "didi", color: "#FF6B00" },
  { id: "rappi", name: "Rappi", icon: "rappi", color: "#FF441F" },
  { id: "sin_delantal", name: "Sin Delantal", icon: "sinDelantal", color: "#E31837" },
  { id: "pedidos_ya", name: "Pedidos Ya", icon: "pedidosYa", color: "#D72B61" },
  { id: "cornershop", name: "Cornershop", icon: "cornershop", color: "#FF5A5F" },
];
