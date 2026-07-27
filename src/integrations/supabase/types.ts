export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          matricule_fiscal: string | null
          notes: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          matricule_fiscal?: string | null
          notes?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          matricule_fiscal?: string | null
          notes?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string
          ccb: string | null
          company_name: string
          default_vat_rate: number
          email: string | null
          fiscal_stamp: number
          footer_address: string | null
          id: number
          logo_url: string | null
          matricule_fiscal: string | null
          phone: string | null
          rc: string | null
          updated_at: string
        }
        Insert: {
          address?: string
          ccb?: string | null
          company_name?: string
          default_vat_rate?: number
          email?: string | null
          fiscal_stamp?: number
          footer_address?: string | null
          id?: number
          logo_url?: string | null
          matricule_fiscal?: string | null
          phone?: string | null
          rc?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          ccb?: string | null
          company_name?: string
          default_vat_rate?: number
          email?: string | null
          fiscal_stamp?: number
          footer_address?: string | null
          id?: number
          logo_url?: string | null
          matricule_fiscal?: string | null
          phone?: string | null
          rc?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      document_sequences: {
        Row: {
          doc_type: string
          last_number: number
          year: number
        }
        Insert: {
          doc_type: string
          last_number?: number
          year: number
        }
        Update: {
          doc_type?: string
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_ht: number
          amount_ttc: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string
          supplier_id: string | null
          updated_at: string
          vat_amount: number
        }
        Insert: {
          amount_ht?: number
          amount_ttc?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          supplier_id?: string | null
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          amount_ht?: number
          amount_ttc?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          supplier_id?: string | null
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          position: number
          quantity: number
          total_ht: number
          unit: string | null
          unit_price_ht: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          total_ht?: number
          unit?: string | null
          unit_price_ht?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          total_ht?: number
          unit?: string | null
          unit_price_ht?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          converted_from_quotation_id: string | null
          created_at: string
          created_by: string | null
          document_date: string
          fiscal_stamp: number
          id: string
          notes: string | null
          number: number
          paid_amount: number
          project_address: string | null
          project_name: string | null
          status: Database["public"]["Enums"]["doc_status"]
          subtotal_ht: number
          total_ttc: number
          updated_at: string
          vat_amount: number
          vat_rate: number
          year: number
        }
        Insert: {
          client_id: string
          converted_from_quotation_id?: string | null
          created_at?: string
          created_by?: string | null
          document_date?: string
          fiscal_stamp?: number
          id?: string
          notes?: string | null
          number: number
          paid_amount?: number
          project_address?: string | null
          project_name?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal_ht?: number
          total_ttc?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          year: number
        }
        Update: {
          client_id?: string
          converted_from_quotation_id?: string | null
          created_at?: string
          created_by?: string | null
          document_date?: string
          fiscal_stamp?: number
          id?: string
          notes?: string | null
          number?: number
          paid_amount?: number
          project_address?: string | null
          project_name?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal_ht?: number
          total_ttc?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_converted_from_quotation_id_fkey"
            columns: ["converted_from_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          method: string
          notes: string | null
          payment_date: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_invoice_items: {
        Row: {
          description: string
          id: string
          position: number
          purchase_invoice_id: string
          quantity: number
          total_ht: number
          unit: string | null
          unit_price_ht: number
        }
        Insert: {
          description: string
          id?: string
          position?: number
          purchase_invoice_id: string
          quantity?: number
          total_ht?: number
          unit?: string | null
          unit_price_ht?: number
        }
        Update: {
          description?: string
          id?: string
          position?: number
          purchase_invoice_id?: string
          quantity?: number
          total_ht?: number
          unit?: string | null
          unit_price_ht?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_items_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoices: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fiscal_stamp: number
          id: string
          invoice_date: string
          net_payable: number
          notes: string | null
          status: Database["public"]["Enums"]["doc_status"]
          subtotal_ht: number
          supplier_id: string | null
          supplier_invoice_number: string | null
          total_ttc: number
          updated_at: string
          vat_amount: number
          vat_rate: number
          withholding_amount: number
          withholding_rate: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fiscal_stamp?: number
          id?: string
          invoice_date?: string
          net_payable?: number
          notes?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal_ht?: number
          supplier_id?: string | null
          supplier_invoice_number?: string | null
          total_ttc?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          withholding_amount?: number
          withholding_rate?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fiscal_stamp?: number
          id?: string
          invoice_date?: string
          net_payable?: number
          notes?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal_ht?: number
          supplier_id?: string | null
          supplier_invoice_number?: string | null
          total_ttc?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          withholding_amount?: number
          withholding_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          description: string
          id: string
          position: number
          quantity: number
          quotation_id: string
          total_ht: number
          unit: string | null
          unit_price_ht: number
        }
        Insert: {
          description: string
          id?: string
          position?: number
          quantity?: number
          quotation_id: string
          total_ht?: number
          unit?: string | null
          unit_price_ht?: number
        }
        Update: {
          description?: string
          id?: string
          position?: number
          quantity?: number
          quotation_id?: string
          total_ht?: number
          unit?: string | null
          unit_price_ht?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          document_date: string
          fiscal_stamp: number
          id: string
          notes: string | null
          number: number
          project_address: string | null
          project_name: string | null
          status: Database["public"]["Enums"]["doc_status"]
          subtotal_ht: number
          total_ttc: number
          updated_at: string
          vat_amount: number
          vat_rate: number
          year: number
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          document_date?: string
          fiscal_stamp?: number
          id?: string
          notes?: string | null
          number: number
          project_address?: string | null
          project_name?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal_ht?: number
          total_ttc?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          year: number
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          document_date?: string
          fiscal_stamp?: number
          id?: string
          notes?: string | null
          number?: number
          project_address?: string | null
          project_name?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal_ht?: number
          total_ttc?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          matricule_fiscal: string | null
          notes: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          matricule_fiscal?: string | null
          notes?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          matricule_fiscal?: string | null
          notes?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withholding_entries: {
        Row: {
          amount: number
          base_amount: number
          beneficiary: string
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          notes: string | null
          rate: number
          updated_at: string
        }
        Insert: {
          amount?: number
          base_amount?: number
          beneficiary: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          rate?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          base_amount?: number
          beneficiary?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      next_document_number: {
        Args: { _doc_type: string; _year: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "administrator" | "assistant"
      doc_status:
        | "draft"
        | "validated"
        | "partially_paid"
        | "paid"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrator", "assistant"],
      doc_status: ["draft", "validated", "partially_paid", "paid", "cancelled", "converted"],
    },
  },
} as const