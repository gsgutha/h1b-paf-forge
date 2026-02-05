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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      authorized_signatories: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          signature_image_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          signature_image_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          signature_image_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lca_disclosure: {
        Row: {
          begin_date: string | null
          case_number: string
          case_status: string
          created_at: string | null
          decision_date: string | null
          employer_address1: string | null
          employer_address2: string | null
          employer_city: string | null
          employer_country: string | null
          employer_dba: string | null
          employer_fein: string | null
          employer_name: string
          employer_phone: string | null
          employer_postal_code: string | null
          employer_state: string | null
          end_date: string | null
          fiscal_year: string | null
          full_time_position: boolean | null
          h1b_dependent: boolean | null
          id: string
          job_title: string | null
          naics_code: string | null
          paf_generated: boolean
          paf_generated_at: string | null
          prevailing_wage: number | null
          pw_source: string | null
          pw_unit: string | null
          pw_wage_level: string | null
          received_date: string | null
          soc_code: string | null
          soc_title: string | null
          total_workers: number | null
          visa_class: string
          wage_rate_from: number | null
          wage_rate_to: number | null
          wage_unit: string | null
          willful_violator: boolean | null
          worksite_city: string | null
          worksite_county: string | null
          worksite_postal_code: string | null
          worksite_state: string | null
        }
        Insert: {
          begin_date?: string | null
          case_number: string
          case_status: string
          created_at?: string | null
          decision_date?: string | null
          employer_address1?: string | null
          employer_address2?: string | null
          employer_city?: string | null
          employer_country?: string | null
          employer_dba?: string | null
          employer_fein?: string | null
          employer_name: string
          employer_phone?: string | null
          employer_postal_code?: string | null
          employer_state?: string | null
          end_date?: string | null
          fiscal_year?: string | null
          full_time_position?: boolean | null
          h1b_dependent?: boolean | null
          id?: string
          job_title?: string | null
          naics_code?: string | null
          paf_generated?: boolean
          paf_generated_at?: string | null
          prevailing_wage?: number | null
          pw_source?: string | null
          pw_unit?: string | null
          pw_wage_level?: string | null
          received_date?: string | null
          soc_code?: string | null
          soc_title?: string | null
          total_workers?: number | null
          visa_class: string
          wage_rate_from?: number | null
          wage_rate_to?: number | null
          wage_unit?: string | null
          willful_violator?: boolean | null
          worksite_city?: string | null
          worksite_county?: string | null
          worksite_postal_code?: string | null
          worksite_state?: string | null
        }
        Update: {
          begin_date?: string | null
          case_number?: string
          case_status?: string
          created_at?: string | null
          decision_date?: string | null
          employer_address1?: string | null
          employer_address2?: string | null
          employer_city?: string | null
          employer_country?: string | null
          employer_dba?: string | null
          employer_fein?: string | null
          employer_name?: string
          employer_phone?: string | null
          employer_postal_code?: string | null
          employer_state?: string | null
          end_date?: string | null
          fiscal_year?: string | null
          full_time_position?: boolean | null
          h1b_dependent?: boolean | null
          id?: string
          job_title?: string | null
          naics_code?: string | null
          paf_generated?: boolean
          paf_generated_at?: string | null
          prevailing_wage?: number | null
          pw_source?: string | null
          pw_unit?: string | null
          pw_wage_level?: string | null
          received_date?: string | null
          soc_code?: string | null
          soc_title?: string | null
          total_workers?: number | null
          visa_class?: string
          wage_rate_from?: number | null
          wage_rate_to?: number | null
          wage_unit?: string | null
          willful_violator?: boolean | null
          worksite_city?: string | null
          worksite_county?: string | null
          worksite_postal_code?: string | null
          worksite_state?: string | null
        }
        Relationships: []
      }
      oflc_prevailing_wages: {
        Row: {
          area_code: string
          area_name: string
          created_at: string
          id: string
          level_1_annual: number | null
          level_1_hourly: number | null
          level_2_annual: number | null
          level_2_hourly: number | null
          level_3_annual: number | null
          level_3_hourly: number | null
          level_4_annual: number | null
          level_4_hourly: number | null
          mean_annual: number | null
          mean_hourly: number | null
          soc_code: string
          soc_title: string
          wage_year: string
        }
        Insert: {
          area_code: string
          area_name: string
          created_at?: string
          id?: string
          level_1_annual?: number | null
          level_1_hourly?: number | null
          level_2_annual?: number | null
          level_2_hourly?: number | null
          level_3_annual?: number | null
          level_3_hourly?: number | null
          level_4_annual?: number | null
          level_4_hourly?: number | null
          mean_annual?: number | null
          mean_hourly?: number | null
          soc_code: string
          soc_title: string
          wage_year: string
        }
        Update: {
          area_code?: string
          area_name?: string
          created_at?: string
          id?: string
          level_1_annual?: number | null
          level_1_hourly?: number | null
          level_2_annual?: number | null
          level_2_hourly?: number | null
          level_3_annual?: number | null
          level_3_hourly?: number | null
          level_4_annual?: number | null
          level_4_hourly?: number | null
          mean_annual?: number | null
          mean_hourly?: number | null
          soc_code?: string
          soc_title?: string
          wage_year?: string
        }
        Relationships: []
      }
      paf_records: {
        Row: {
          actual_wage: number
          actual_wage_memo_path: string | null
          actual_wage_unit: string
          begin_date: string
          benefits_comparison_path: string | null
          created_at: string
          employer_address1: string
          employer_address2: string | null
          employer_city: string
          employer_country: string
          employer_fein: string
          employer_legal_name: string
          employer_naics_code: string
          employer_postal_code: string
          employer_state: string
          employer_telephone: string
          employer_trade_name: string | null
          end_date: string
          id: string
          is_full_time: boolean
          is_h1b_dependent: boolean
          is_rd: boolean | null
          is_willful_violator: boolean
          job_title: string
          lca_case_number: string | null
          lca_file_path: string | null
          notice_posting_proof_path: string | null
          onet_code: string | null
          onet_title: string | null
          prevailing_wage: number
          prevailing_wage_unit: string
          soc_code: string
          soc_title: string
          updated_at: string
          visa_type: string
          wage_level: string
          wage_rate_from: number
          wage_rate_to: number | null
          wage_source: string
          wage_source_date: string
          wage_unit: string
          worker_name: string | null
          workers_needed: number
          worksite_address1: string
          worksite_address2: string | null
          worksite_area_code: string | null
          worksite_area_name: string | null
          worksite_city: string
          worksite_county: string | null
          worksite_postal_code: string
          worksite_state: string
        }
        Insert: {
          actual_wage: number
          actual_wage_memo_path?: string | null
          actual_wage_unit: string
          begin_date: string
          benefits_comparison_path?: string | null
          created_at?: string
          employer_address1: string
          employer_address2?: string | null
          employer_city: string
          employer_country?: string
          employer_fein: string
          employer_legal_name: string
          employer_naics_code: string
          employer_postal_code: string
          employer_state: string
          employer_telephone: string
          employer_trade_name?: string | null
          end_date: string
          id?: string
          is_full_time?: boolean
          is_h1b_dependent?: boolean
          is_rd?: boolean | null
          is_willful_violator?: boolean
          job_title: string
          lca_case_number?: string | null
          lca_file_path?: string | null
          notice_posting_proof_path?: string | null
          onet_code?: string | null
          onet_title?: string | null
          prevailing_wage: number
          prevailing_wage_unit: string
          soc_code: string
          soc_title: string
          updated_at?: string
          visa_type?: string
          wage_level: string
          wage_rate_from: number
          wage_rate_to?: number | null
          wage_source: string
          wage_source_date: string
          wage_unit: string
          worker_name?: string | null
          workers_needed?: number
          worksite_address1: string
          worksite_address2?: string | null
          worksite_area_code?: string | null
          worksite_area_name?: string | null
          worksite_city: string
          worksite_county?: string | null
          worksite_postal_code: string
          worksite_state: string
        }
        Update: {
          actual_wage?: number
          actual_wage_memo_path?: string | null
          actual_wage_unit?: string
          begin_date?: string
          benefits_comparison_path?: string | null
          created_at?: string
          employer_address1?: string
          employer_address2?: string | null
          employer_city?: string
          employer_country?: string
          employer_fein?: string
          employer_legal_name?: string
          employer_naics_code?: string
          employer_postal_code?: string
          employer_state?: string
          employer_telephone?: string
          employer_trade_name?: string | null
          end_date?: string
          id?: string
          is_full_time?: boolean
          is_h1b_dependent?: boolean
          is_rd?: boolean | null
          is_willful_violator?: boolean
          job_title?: string
          lca_case_number?: string | null
          lca_file_path?: string | null
          notice_posting_proof_path?: string | null
          onet_code?: string | null
          onet_title?: string | null
          prevailing_wage?: number
          prevailing_wage_unit?: string
          soc_code?: string
          soc_title?: string
          updated_at?: string
          visa_type?: string
          wage_level?: string
          wage_rate_from?: number
          wage_rate_to?: number | null
          wage_source?: string
          wage_source_date?: string
          wage_unit?: string
          worker_name?: string | null
          workers_needed?: number
          worksite_address1?: string
          worksite_address2?: string | null
          worksite_area_code?: string | null
          worksite_area_name?: string | null
          worksite_city?: string
          worksite_county?: string | null
          worksite_postal_code?: string
          worksite_state?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
