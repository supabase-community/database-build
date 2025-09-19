export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      deploy_waitlist: {
        Row: {
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      deployed_databases: {
        Row: {
          created_at: string
          deployment_provider_integration_id: number
          id: number
          local_database_id: string
          provider_metadata: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          deployment_provider_integration_id: number
          id?: never
          local_database_id: string
          provider_metadata?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          deployment_provider_integration_id?: number
          id?: never
          local_database_id?: string
          provider_metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployed_databases_deployment_provider_integration_id_fkey"
            columns: ["deployment_provider_integration_id"]
            isOneToOne: false
            referencedRelation: "deployment_provider_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_provider_integrations: {
        Row: {
          created_at: string
          credentials: string | null
          deployment_provider_id: number | null
          id: number
          revoked_at: string | null
          scope: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials?: string | null
          deployment_provider_id?: number | null
          id?: never
          revoked_at?: string | null
          scope?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          credentials?: string | null
          deployment_provider_id?: number | null
          id?: never
          revoked_at?: string | null
          scope?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_provider_integrations_deployment_provider_id_fkey"
            columns: ["deployment_provider_id"]
            isOneToOne: false
            referencedRelation: "deployment_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_providers: {
        Row: {
          created_at: string
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      deployments: {
        Row: {
          created_at: string
          deployed_database_id: number | null
          events: Json
          id: number
          local_database_id: string
          status: Database["public"]["Enums"]["deployment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deployed_database_id?: number | null
          events?: Json
          id?: never
          local_database_id: string
          status?: Database["public"]["Enums"]["deployment_status"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          deployed_database_id?: number | null
          events?: Json
          id?: never
          local_database_id?: string
          status?: Database["public"]["Enums"]["deployment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_deployed_database_id_fkey"
            columns: ["deployed_database_id"]
            isOneToOne: false
            referencedRelation: "deployed_databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_deployed_database_id_fkey"
            columns: ["deployed_database_id"]
            isOneToOne: false
            referencedRelation: "latest_deployed_databases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      latest_deployed_databases: {
        Row: {
          created_at: string | null
          deployment_provider_integration_id: number | null
          id: number | null
          last_deployment_at: string | null
          local_database_id: string | null
          provider_metadata: Json | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deployed_databases_deployment_provider_integration_id_fkey"
            columns: ["deployment_provider_integration_id"]
            isOneToOne: false
            referencedRelation: "deployment_provider_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_secret: {
        Args: { secret_id: string }
        Returns: number
      }
      insert_secret: {
        Args: { name: string; secret: string }
        Returns: string
      }
      read_secret: {
        Args: { secret_id: string }
        Returns: string
      }
      supabase_functions_certificate_secret: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      supabase_url: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_secret: {
        Args: { new_secret: string; secret_id: string }
        Returns: string
      }
      upsert_secret: {
        Args: { name: string; secret: string }
        Returns: string
      }
    }
    Enums: {
      deployment_status: "in_progress" | "success" | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      deployment_status: ["in_progress", "success", "failed"],
    },
  },
} as const

