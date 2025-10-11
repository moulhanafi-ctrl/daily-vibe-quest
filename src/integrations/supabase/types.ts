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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_audit: {
        Row: {
          action: string
          actor: string
          actor_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          error_message: string | null
          id: string
          input_json: Json
          output_json: Json | null
          rollback_ref: string | null
          status: string
          target: string | null
          tool: string
        }
        Insert: {
          action: string
          actor?: string
          actor_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_json: Json
          output_json?: Json | null
          rollback_ref?: string | null
          status?: string
          target?: string | null
          tool: string
        }
        Update: {
          action?: string
          actor?: string
          actor_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_json?: Json
          output_json?: Json | null
          rollback_ref?: string | null
          status?: string
          target?: string | null
          tool?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_rollback_ref_fkey"
            columns: ["rollback_ref"]
            isOneToOne: false
            referencedRelation: "ai_audit"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          suggestion_type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          suggestion_type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          suggestion_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          room_id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          room_id: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          room_id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at: string | null
          description: string | null
          focus_area: string
          id: string
          name: string
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string | null
          description?: string | null
          focus_area: string
          id?: string
          name: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string | null
          description?: string | null
          focus_area?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      family_groups: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          invite_code: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_invites: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invite_code: string
          is_used: boolean | null
          parent_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code: string
          is_used?: boolean | null
          parent_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          is_used?: boolean | null
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          family_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          family_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          family_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          flagged_by: string | null
          id: string
          message_id: string | null
          room_id: string | null
          severity: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          flagged_by?: string | null
          id?: string
          message_id?: string | null
          room_id?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          flagged_by?: string | null
          id?: string
          message_id?: string | null
          room_id?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_actions: {
        Row: {
          action: string
          created_at: string
          duration: unknown | null
          expires_at: string | null
          id: string
          incident_id: string | null
          metadata: Json | null
          moderator_id: string
          reason: string
          target_user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          duration?: unknown | null
          expires_at?: string | null
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          moderator_id: string
          reason: string
          target_user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          duration?: unknown | null
          expires_at?: string | null
          id?: string
          incident_id?: string | null
          metadata?: Json | null
          moderator_id?: string
          reason?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderator_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      moods: {
        Row: {
          created_at: string | null
          id: string
          intensity: number | null
          mood: Database["public"]["Enums"]["mood_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          intensity?: number | null
          mood: Database["public"]["Enums"]["mood_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          intensity?: number | null
          mood?: Database["public"]["Enums"]["mood_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      motivational_content: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"] | null
          audio_url: string | null
          content: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string | null
          id: string
          tags: string[] | null
          target_mood: Database["public"]["Enums"]["mood_type"] | null
          title: string
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"] | null
          audio_url?: string | null
          content: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          id?: string
          tags?: string[] | null
          target_mood?: Database["public"]["Enums"]["mood_type"] | null
          title: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"] | null
          audio_url?: string | null
          content?: string
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string | null
          id?: string
          tags?: string[] | null
          target_mood?: Database["public"]["Enums"]["mood_type"] | null
          title?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          price_at_purchase: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          price_at_purchase: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          price_at_purchase?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_id: string | null
          stripe_session_id: string | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          age_group: Database["public"]["Enums"]["age_group"]
          created_at: string | null
          description: string
          download_link: string | null
          file_urls: string[] | null
          id: string
          image_url: string | null
          images: string[] | null
          name: string
          preview_url: string | null
          price: number
          product_type: Database["public"]["Enums"]["product_type"]
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          age_group: Database["public"]["Enums"]["age_group"]
          created_at?: string | null
          description: string
          download_link?: string | null
          file_urls?: string[] | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          name: string
          preview_url?: string | null
          price: number
          product_type?: Database["public"]["Enums"]["product_type"]
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string | null
          description?: string
          download_link?: string | null
          file_urls?: string[] | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          name?: string
          preview_url?: string | null
          price?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          age_group: Database["public"]["Enums"]["age_group"]
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string
          inclusion_acknowledged_version: string | null
          is_parent: boolean | null
          optional_reflection: string | null
          parent_id: string | null
          pronouns: string | null
          selected_focus_areas: string[] | null
          sex: string | null
          show_pronouns: boolean | null
          subscription_expires_at: string | null
          subscription_status: string | null
          updated_at: string | null
          username: string | null
          zipcode: string | null
        }
        Insert: {
          age?: number | null
          age_group?: Database["public"]["Enums"]["age_group"]
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          inclusion_acknowledged_version?: string | null
          is_parent?: boolean | null
          optional_reflection?: string | null
          parent_id?: string | null
          pronouns?: string | null
          selected_focus_areas?: string[] | null
          sex?: string | null
          show_pronouns?: boolean | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
          zipcode?: string | null
        }
        Update: {
          age?: number | null
          age_group?: Database["public"]["Enums"]["age_group"]
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          inclusion_acknowledged_version?: string | null
          is_parent?: boolean | null
          optional_reflection?: string | null
          parent_id?: string | null
          pronouns?: string | null
          selected_focus_areas?: string[] | null
          sex?: string | null
          show_pronouns?: boolean | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          username?: string | null
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          parent_id: string
          product_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          parent_id: string
          product_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string
          product_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reflections: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_private: boolean | null
          mood_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          mood_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          mood_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_mood_id_fkey"
            columns: ["mood_id"]
            isOneToOne: false
            referencedRelation: "moods"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          rating: number
          text: string | null
          user_id: string
          user_public_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          rating: number
          text?: string | null
          user_id: string
          user_public_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          rating?: number
          text?: string | null
          user_id?: string
          user_public_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          admin_role: Database["public"]["Enums"]["admin_role"] | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          admin_role?: Database["public"]["Enums"]["admin_role"] | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          admin_role?: Database["public"]["Enums"]["admin_role"] | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_age_group: {
        Args: { user_age: number }
        Returns: Database["public"]["Enums"]["age_group"]
      }
      generate_family_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_admin_role: {
        Args: {
          _admin_role: Database["public"]["Enums"]["admin_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_parent_of: {
        Args: { _child_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_role:
        | "owner"
        | "moderator"
        | "support"
        | "analyst"
        | "store_manager"
      age_group: "child" | "teen" | "adult" | "elder"
      app_role: "admin" | "user"
      content_type: "audio" | "text" | "video"
      mood_type:
        | "happy"
        | "calm"
        | "anxious"
        | "sad"
        | "angry"
        | "excited"
        | "tired"
      order_status: "pending" | "completed" | "failed" | "refunded"
      product_type: "physical" | "digital"
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
      admin_role: ["owner", "moderator", "support", "analyst", "store_manager"],
      age_group: ["child", "teen", "adult", "elder"],
      app_role: ["admin", "user"],
      content_type: ["audio", "text", "video"],
      mood_type: [
        "happy",
        "calm",
        "anxious",
        "sad",
        "angry",
        "excited",
        "tired",
      ],
      order_status: ["pending", "completed", "failed", "refunded"],
      product_type: ["physical", "digital"],
    },
  },
} as const
