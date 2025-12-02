import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente de Supabase para uso en cliente (browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Tipos para TypeScript (autocompletado)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          clerk_id: string;
          email: string;
          first_name: string;
          last_name: string;
          image: string | null;
          role: 'ADMIN' | 'USER' | 'CUSTOMER';
          restaurant_id: string | null;
          age: number | null;
          height: number | null;
          weight: number | null;
          gender: string | null;
          blood_group: string | null;
          medical_issues: string | null;
          stripe_customer_id: string | null;
          stripe_invoice_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          user_id: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          sku: string;
          barcode: string | null;
          name: string;
          description: string | null;
          category_id: string | null;
          user_id: string;
          product_type: string;
          price: number;
          cost: number;
          stock: number;
          min_stock: number;
          max_stock: number;
          image_url: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          credit_limit: number;
          credit_balance: number;
          points: number;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      sales: {
        Row: {
          id: string;
          sale_number: string;
          customer_id: string | null;
          user_id: string | null;
          subtotal: number;
          discount: number;
          tax: number;
          total: number;
          payment_method: 'cash' | 'card' | 'transfer' | 'credit';
          status: 'pending' | 'completed' | 'cancelled' | 'refunded';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'created_at'> & {
          sale_number?: string;
        };
        Update: Partial<Database['public']['Tables']['sales']['Insert']>;
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          discount: number;
        };
        Insert: Omit<Database['public']['Tables']['sale_items']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['sale_items']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          total: number;
          currency: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          price: number;
          currency: string;
          image_url: string | null;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      kitchen_orders: {
        Row: {
          id: string;
          order_number: string;
          source: 'pos' | 'uber_eats' | 'didi_food' | 'rappi' | 'pedidos_ya' | 'sin_delantal' | 'cornershop';
          external_order_id: string | null;
          table_number: string | null;
          customer_name: string | null;
          service_type: 'dine_in' | 'takeout' | 'delivery';
          status: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
          total: number;
          notes: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
          started_at: string | null;
          ready_at: string | null;
          delivered_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['kitchen_orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['kitchen_orders']['Insert']>;
      };
      kitchen_order_items: {
        Row: {
          id: string;
          kitchen_order_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          modifiers: string | null;
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['kitchen_order_items']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['kitchen_order_items']['Insert']>;
      };
      platform_integrations: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          api_key: string | null;
          api_secret: string | null;
          store_id: string | null;
          webhook_secret: string | null;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['platform_integrations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['platform_integrations']['Insert']>;
      };
    };
    Views: {
      low_stock_products: {
        Row: Database['public']['Tables']['products']['Row'] & {
          category_name: string | null;
        };
      };
      sales_detailed: {
        Row: Database['public']['Tables']['sales']['Row'] & {
          customer_name: string | null;
          user_name: string | null;
          items_count: number;
        };
      };
      daily_sales_report: {
        Row: {
          sale_date: string;
          total_sales: number;
          total_revenue: number;
          average_sale: number;
          cash_sales: number;
          card_sales: number;
          transfer_sales: number;
          credit_sales: number;
        };
      };
    };
  };
};
