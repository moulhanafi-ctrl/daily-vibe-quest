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
      admin_role_audit: {
        Row: {
          action: string
          id: string
          new_admin_role: Database["public"]["Enums"]["admin_role"] | null
          new_role: Database["public"]["Enums"]["app_role"] | null
          old_admin_role: Database["public"]["Enums"]["admin_role"] | null
          old_role: Database["public"]["Enums"]["app_role"] | null
          performed_at: string | null
          performed_by: string
          target_user_id: string
        }
        Insert: {
          action: string
          id?: string
          new_admin_role?: Database["public"]["Enums"]["admin_role"] | null
          new_role?: Database["public"]["Enums"]["app_role"] | null
          old_admin_role?: Database["public"]["Enums"]["admin_role"] | null
          old_role?: Database["public"]["Enums"]["app_role"] | null
          performed_at?: string | null
          performed_by: string
          target_user_id: string
        }
        Update: {
          action?: string
          id?: string
          new_admin_role?: Database["public"]["Enums"]["admin_role"] | null
          new_role?: Database["public"]["Enums"]["app_role"] | null
          old_admin_role?: Database["public"]["Enums"]["admin_role"] | null
          old_role?: Database["public"]["Enums"]["app_role"] | null
          performed_at?: string | null
          performed_by?: string
          target_user_id?: string
        }
        Relationships: []
      }
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
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_metadata: Json | null
          event_type: string
          id: string
          language: string | null
          page_url: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_metadata?: Json | null
          event_type: string
          id?: string
          language?: string | null
          page_url?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_metadata?: Json | null
          event_type?: string
          id?: string
          language?: string | null
          page_url?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          security_flags: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          security_flags?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          security_flags?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      arthur_config: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          enabled: boolean | null
          id: string
          intro: string
          name: string
          signature: string
          tone: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          intro?: string
          name?: string
          signature?: string
          tone?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          intro?: string
          name?: string
          signature?: string
          tone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      arthur_deliveries: {
        Row: {
          clicked_at: string | null
          content_sent: string
          created_at: string | null
          delivered_at: string | null
          id: string
          message_type: string
          opened_at: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          content_sent: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          message_type: string
          opened_at?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          content_sent?: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          message_type?: string
          opened_at?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arthur_deliveries_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "arthur_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arthur_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arthur_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      arthur_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          max_daily_messages: number | null
          preferred_time: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          max_daily_messages?: number | null
          preferred_time?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          max_daily_messages?: number | null
          preferred_time?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arthur_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "arthur_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      arthur_templates: {
        Row: {
          ab_variant: string | null
          active: boolean | null
          age_group: Database["public"]["Enums"]["age_group"]
          content: string
          cooldown_days: number | null
          created_at: string | null
          focus_area: string
          id: string
          message_type: string
          priority: number | null
          time_of_day: string | null
          updated_at: string | null
        }
        Insert: {
          ab_variant?: string | null
          active?: boolean | null
          age_group: Database["public"]["Enums"]["age_group"]
          content: string
          cooldown_days?: number | null
          created_at?: string | null
          focus_area: string
          id?: string
          message_type: string
          priority?: number | null
          time_of_day?: string | null
          updated_at?: string | null
        }
        Update: {
          ab_variant?: string | null
          active?: boolean | null
          age_group?: Database["public"]["Enums"]["age_group"]
          content?: string
          cooldown_days?: number | null
          created_at?: string | null
          focus_area?: string
          id?: string
          message_type?: string
          priority?: number | null
          time_of_day?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          focus_area_key: string | null
          id: string
          name: string
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string | null
          description?: string | null
          focus_area: string
          focus_area_key?: string | null
          id?: string
          name: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string | null
          description?: string | null
          focus_area?: string
          focus_area_key?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      child_sharing_preferences: {
        Row: {
          can_share_journals: boolean | null
          child_id: string
          created_at: string | null
          id: string
          share_default: boolean | null
          updated_at: string | null
        }
        Insert: {
          can_share_journals?: boolean | null
          child_id: string
          created_at?: string | null
          id?: string
          share_default?: boolean | null
          updated_at?: string | null
        }
        Update: {
          can_share_journals?: boolean | null
          child_id?: string
          created_at?: string | null
          id?: string
          share_default?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_sharing_preferences_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "child_sharing_preferences_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_ledger: {
        Row: {
          accepted_at: string | null
          accepted_ip: string | null
          guardian_id: string | null
          guidelines_accepted: boolean | null
          id: string
          not_therapy_acknowledged: boolean | null
          privacy_accepted: boolean | null
          terms_accepted: boolean | null
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_ip?: string | null
          guardian_id?: string | null
          guidelines_accepted?: boolean | null
          id?: string
          not_therapy_acknowledged?: boolean | null
          privacy_accepted?: boolean | null
          terms_accepted?: boolean | null
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string | null
          accepted_ip?: string | null
          guardian_id?: string | null
          guidelines_accepted?: boolean | null
          id?: string
          not_therapy_acknowledged?: boolean | null
          privacy_accepted?: boolean | null
          terms_accepted?: boolean | null
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      data_deletion_requests: {
        Row: {
          cancellation_token: string | null
          completed_at: string | null
          error: string | null
          grace_period_ends_at: string | null
          id: string
          requested_at: string | null
          status: Database["public"]["Enums"]["data_deletion_status"]
          user_id: string
        }
        Insert: {
          cancellation_token?: string | null
          completed_at?: string | null
          error?: string | null
          grace_period_ends_at?: string | null
          id?: string
          requested_at?: string | null
          status?: Database["public"]["Enums"]["data_deletion_status"]
          user_id: string
        }
        Update: {
          cancellation_token?: string | null
          completed_at?: string | null
          error?: string | null
          grace_period_ends_at?: string | null
          id?: string
          requested_at?: string | null
          status?: Database["public"]["Enums"]["data_deletion_status"]
          user_id?: string
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          download_url: string | null
          error: string | null
          expires_at: string | null
          file_path: string | null
          id: string
          status: Database["public"]["Enums"]["data_export_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          download_url?: string | null
          error?: string | null
          expires_at?: string | null
          file_path?: string | null
          id?: string
          status?: Database["public"]["Enums"]["data_export_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          download_url?: string | null
          error?: string | null
          expires_at?: string | null
          file_path?: string | null
          id?: string
          status?: Database["public"]["Enums"]["data_export_status"]
          user_id?: string
        }
        Relationships: []
      }
      digital_assets: {
        Row: {
          created_at: string | null
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_downloads: {
        Row: {
          created_at: string | null
          digital_asset_id: string
          download_count: number
          expires_at: string
          id: string
          max_downloads: number
          order_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          digital_asset_id: string
          download_count?: number
          expires_at?: string
          id?: string
          max_downloads?: number
          order_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          digital_asset_id?: string
          download_count?: number
          expires_at?: string
          id?: string
          max_downloads?: number
          order_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_downloads_digital_asset_id_fkey"
            columns: ["digital_asset_id"]
            isOneToOne: false
            referencedRelation: "digital_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_downloads_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
          },
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
          invitee_email: string | null
          invitee_name: string | null
          is_used: boolean | null
          parent_id: string
          relationship: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code: string
          invitee_email?: string | null
          invitee_name?: string | null
          is_used?: boolean | null
          parent_id: string
          relationship?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          invitee_email?: string | null
          invitee_name?: string | null
          is_used?: boolean | null
          parent_id?: string
          relationship?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
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
      family_scores: {
        Row: {
          family_id: string
          id: string
          participants: number
          played_at: string | null
          round_id: string
          total_score: number
        }
        Insert: {
          family_id: string
          id?: string
          participants?: number
          played_at?: string | null
          round_id: string
          total_score?: number
        }
        Update: {
          family_id?: string
          id?: string
          participants?: number
          played_at?: string | null
          round_id?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "family_scores_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "trivia_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      family_stories: {
        Row: {
          created_at: string | null
          duration_seconds: number
          expires_at: string | null
          family_id: string | null
          id: string
          thumbnail_url: string | null
          user_id: string
          video_url: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds: number
          expires_at?: string | null
          family_id?: string | null
          id?: string
          thumbnail_url?: string | null
          user_id: string
          video_url: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number
          expires_at?: string | null
          family_id?: string | null
          id?: string
          thumbnail_url?: string | null
          user_id?: string
          video_url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "family_stories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          flag_key: string
          id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          flag_key: string
          id?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          flag_key?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      geocode_cache: {
        Row: {
          address_hash: string
          address_input: string
          created_at: string
          id: string
          latitude: number
          longitude: number
        }
        Insert: {
          address_hash: string
          address_input: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
        }
        Update: {
          address_hash?: string
          address_input?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
        }
        Relationships: []
      }
      geocode_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          input_address: string
          result_lat: number | null
          result_lon: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          input_address: string
          result_lat?: number | null
          result_lon?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          input_address?: string
          result_lat?: number | null
          result_lon?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      guardian_links: {
        Row: {
          attempts: number
          child_id: string
          code_expires_at: string | null
          code_hash: string | null
          created_at: string
          guardian_email: string
          id: string
          last_sent_at: string | null
          method: string
          status: Database["public"]["Enums"]["guardian_verification_status"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          child_id: string
          code_expires_at?: string | null
          code_hash?: string | null
          created_at?: string
          guardian_email: string
          id?: string
          last_sent_at?: string | null
          method?: string
          status?: Database["public"]["Enums"]["guardian_verification_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          child_id?: string
          code_expires_at?: string | null
          code_hash?: string | null
          created_at?: string
          guardian_email?: string
          id?: string
          last_sent_at?: string | null
          method?: string
          status?: Database["public"]["Enums"]["guardian_verification_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      help_locations: {
        Row: {
          accepts_insurance: boolean | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string | null
          id: string
          insurers: string[] | null
          is_active: boolean | null
          is_national: boolean | null
          last_verified_at: string | null
          lat: number | null
          latitude: number | null
          lon: number | null
          longitude: number | null
          name: string
          open_hours: Json | null
          open_now: boolean | null
          phone: string | null
          postal_code: string | null
          priority: number | null
          ratings: Json | null
          sliding_scale: boolean | null
          source: string | null
          state: string | null
          tags: string[] | null
          telehealth: boolean | null
          type: Database["public"]["Enums"]["help_location_type"]
          updated_at: string | null
          website_url: string | null
          zip_coverage: string[] | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          insurers?: string[] | null
          is_active?: boolean | null
          is_national?: boolean | null
          last_verified_at?: string | null
          lat?: number | null
          latitude?: number | null
          lon?: number | null
          longitude?: number | null
          name: string
          open_hours?: Json | null
          open_now?: boolean | null
          phone?: string | null
          postal_code?: string | null
          priority?: number | null
          ratings?: Json | null
          sliding_scale?: boolean | null
          source?: string | null
          state?: string | null
          tags?: string[] | null
          telehealth?: boolean | null
          type: Database["public"]["Enums"]["help_location_type"]
          updated_at?: string | null
          website_url?: string | null
          zip_coverage?: string[] | null
        }
        Update: {
          accepts_insurance?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          insurers?: string[] | null
          is_active?: boolean | null
          is_national?: boolean | null
          last_verified_at?: string | null
          lat?: number | null
          latitude?: number | null
          lon?: number | null
          longitude?: number | null
          name?: string
          open_hours?: Json | null
          open_now?: boolean | null
          phone?: string | null
          postal_code?: string | null
          priority?: number | null
          ratings?: Json | null
          sliding_scale?: boolean | null
          source?: string | null
          state?: string | null
          tags?: string[] | null
          telehealth?: boolean | null
          type?: Database["public"]["Enums"]["help_location_type"]
          updated_at?: string | null
          website_url?: string | null
          zip_coverage?: string[] | null
        }
        Relationships: []
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
      journal_access_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          journal_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          journal_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          journal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_access_logs_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          audio_url: string | null
          body: string | null
          created_at: string | null
          date: string
          id: string
          mood: number | null
          mood_id: string | null
          shared_with_parent: boolean | null
          tags: string[] | null
          title: string | null
          transcript: string | null
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          audio_url?: string | null
          body?: string | null
          created_at?: string | null
          date?: string
          id?: string
          mood?: number | null
          mood_id?: string | null
          shared_with_parent?: boolean | null
          tags?: string[] | null
          title?: string | null
          transcript?: string | null
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          audio_url?: string | null
          body?: string | null
          created_at?: string | null
          date?: string
          id?: string
          mood?: number | null
          mood_id?: string | null
          shared_with_parent?: boolean | null
          tags?: string[] | null
          title?: string | null
          transcript?: string | null
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_mood_id_fkey"
            columns: ["mood_id"]
            isOneToOne: false
            referencedRelation: "moods"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_prompts: {
        Row: {
          active: boolean | null
          age_group: Database["public"]["Enums"]["age_group"]
          category: string
          created_at: string | null
          id: string
          prompt: string
        }
        Insert: {
          active?: boolean | null
          age_group: Database["public"]["Enums"]["age_group"]
          category: string
          created_at?: string | null
          id?: string
          prompt: string
        }
        Update: {
          active?: boolean | null
          age_group?: Database["public"]["Enums"]["age_group"]
          category?: string
          created_at?: string | null
          id?: string
          prompt?: string
        }
        Relationships: []
      }
      legal_versions: {
        Row: {
          active: boolean | null
          content_ar: string | null
          content_en: string
          content_es: string | null
          content_fr: string | null
          created_at: string | null
          document_type: string
          id: string
          updated_at: string | null
          version: string
        }
        Insert: {
          active?: boolean | null
          content_ar?: string | null
          content_en: string
          content_es?: string | null
          content_fr?: string | null
          created_at?: string | null
          document_type: string
          id?: string
          updated_at?: string | null
          version: string
        }
        Update: {
          active?: boolean | null
          content_ar?: string | null
          content_en?: string
          content_es?: string | null
          content_fr?: string | null
          created_at?: string | null
          document_type?: string
          id?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
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
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
          },
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
      notification_events: {
        Row: {
          child_id: string
          created_at: string | null
          event_type: string
          id: string
          parent_id: string
          payload: Json
          sent_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          event_type: string
          id?: string
          parent_id: string
          payload: Json
          sent_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          parent_id?: string
          payload?: Json
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_events_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          arthur_enabled: boolean
          channels: string[]
          quiet_hours: Json
          updated_at: string
          user_id: string
          windows: string[]
        }
        Insert: {
          arthur_enabled?: boolean
          channels?: string[]
          quiet_hours?: Json
          updated_at?: string
          user_id: string
          windows?: string[]
        }
        Update: {
          arthur_enabled?: boolean
          channels?: string[]
          quiet_hours?: Json
          updated_at?: string
          user_id?: string
          windows?: string[]
        }
        Relationships: []
      }
      notify_waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          page: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          page: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          page?: string
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
      parent_notification_preferences: {
        Row: {
          checkin_alerts: boolean | null
          created_at: string | null
          daily_digest: boolean | null
          id: string
          journal_alerts: boolean | null
          parent_id: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
        }
        Insert: {
          checkin_alerts?: boolean | null
          created_at?: string | null
          daily_digest?: boolean | null
          id?: string
          journal_alerts?: boolean | null
          parent_id: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
        }
        Update: {
          checkin_alerts?: boolean | null
          created_at?: string | null
          daily_digest?: boolean | null
          id?: string
          journal_alerts?: boolean | null
          parent_id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_notification_preferences_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: true
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "parent_notification_preferences_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          display_order: number
          id: string
          image_url: string
          product_id: string
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          image_url: string
          product_id: string
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          image_url?: string
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
          insurance: Json | null
          is_parent: boolean | null
          language: string | null
          last_login_at: string | null
          legal_consent_accepted_at: string | null
          legal_consent_ip: string | null
          legal_consent_user_agent: string | null
          legal_consent_version: string | null
          location: Json | null
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
          insurance?: Json | null
          is_parent?: boolean | null
          language?: string | null
          last_login_at?: string | null
          legal_consent_accepted_at?: string | null
          legal_consent_ip?: string | null
          legal_consent_user_agent?: string | null
          legal_consent_version?: string | null
          location?: Json | null
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
          insurance?: Json | null
          is_parent?: boolean | null
          language?: string | null
          last_login_at?: string | null
          legal_consent_accepted_at?: string | null
          legal_consent_ip?: string | null
          legal_consent_user_agent?: string | null
          legal_consent_version?: string | null
          location?: Json | null
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
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
          },
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
      push_subscriptions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          endpoint: string
          id: string
          subscription_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          endpoint: string
          id?: string
          subscription_data: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          endpoint?: string
          id?: string
          subscription_data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reflections: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_private: boolean | null
          mood_id: string
          shared_with_parent: boolean | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          mood_id: string
          shared_with_parent?: boolean | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          mood_id?: string
          shared_with_parent?: boolean | null
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
      story_reactions: {
        Row: {
          created_at: string | null
          id: string
          reaction: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reaction: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reaction?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "family_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "family_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_results: {
        Row: {
          category: string
          created_at: string
          duration_ms: number
          error_text: string | null
          id: string
          run_id: string
          status: string
          test_key: string
        }
        Insert: {
          category: string
          created_at?: string
          duration_ms: number
          error_text?: string | null
          id?: string
          run_id: string
          status: string
          test_key: string
        }
        Update: {
          category?: string
          created_at?: string
          duration_ms?: number
          error_text?: string | null
          id?: string
          run_id?: string
          status?: string
          test_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_health_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "system_health_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          failed: number
          finished_at: string | null
          id: string
          passed: number
          started_at: string
          status: string
          total: number
          triggered_by: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          failed?: number
          finished_at?: string | null
          id?: string
          passed?: number
          started_at?: string
          status: string
          total?: number
          triggered_by: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          failed?: number
          finished_at?: string | null
          id?: string
          passed?: number
          started_at?: string
          status?: string
          total?: number
          triggered_by?: string
        }
        Relationships: []
      }
      system_users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          username?: string
        }
        Relationships: []
      }
      test_messages: {
        Row: {
          created_at: string | null
          device_info: Json | null
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      trivia_generation_log: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          candidates: Json | null
          created_at: string | null
          dropped_reasons: Json | null
          error: string | null
          id: string
          kept_ids: string[] | null
          locale: string
          status: string
          updated_at: string | null
          week: string
        }
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"]
          candidates?: Json | null
          created_at?: string | null
          dropped_reasons?: Json | null
          error?: string | null
          id?: string
          kept_ids?: string[] | null
          locale: string
          status?: string
          updated_at?: string | null
          week: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          candidates?: Json | null
          created_at?: string | null
          dropped_reasons?: Json | null
          error?: string | null
          id?: string
          kept_ids?: string[] | null
          locale?: string
          status?: string
          updated_at?: string | null
          week?: string
        }
        Relationships: []
      }
      trivia_preferences: {
        Row: {
          created_at: string | null
          id: string
          notifications_enabled: boolean | null
          sunday_reminder: boolean | null
          timer_enabled: boolean | null
          timer_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          sunday_reminder?: boolean | null
          timer_enabled?: boolean | null
          timer_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notifications_enabled?: boolean | null
          sunday_reminder?: boolean | null
          timer_enabled?: boolean | null
          timer_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trivia_progress: {
        Row: {
          answers: Json | null
          correct: number
          id: string
          played_at: string | null
          round_id: string
          score: number
          streak: number | null
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          correct?: number
          id?: string
          played_at?: string | null
          round_id: string
          score?: number
          streak?: number | null
          total?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          correct?: number
          id?: string
          played_at?: string | null
          round_id?: string
          score?: number
          streak?: number | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trivia_progress_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "trivia_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      trivia_questions: {
        Row: {
          active: boolean | null
          age_group: Database["public"]["Enums"]["age_group"]
          category: string
          correct_option_id: string
          created_at: string | null
          explanation: string | null
          id: string
          locale: string
          options: Json
          prompt: string
          sensitive: boolean | null
          tags: string[] | null
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          age_group: Database["public"]["Enums"]["age_group"]
          category: string
          correct_option_id: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          locale: string
          options: Json
          prompt: string
          sensitive?: boolean | null
          tags?: string[] | null
          type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          age_group?: Database["public"]["Enums"]["age_group"]
          category?: string
          correct_option_id?: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          locale?: string
          options?: Json
          prompt?: string
          sensitive?: boolean | null
          tags?: string[] | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trivia_rounds: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at: string | null
          date: string
          id: string
          locale: string
          published: boolean | null
          question_ids: string[]
        }
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at?: string | null
          date: string
          id?: string
          locale?: string
          published?: boolean | null
          question_ids: string[]
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string | null
          date?: string
          id?: string
          locale?: string
          published?: boolean | null
          question_ids?: string[]
        }
        Relationships: []
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
      zip_centroids: {
        Row: {
          city: string | null
          latitude: number
          longitude: number
          state: string | null
          updated_at: string | null
          zip: string
        }
        Insert: {
          city?: string | null
          latitude: number
          longitude: number
          state?: string | null
          updated_at?: string | null
          zip: string
        }
        Update: {
          city?: string | null
          latitude?: number
          longitude?: number
          state?: string | null
          updated_at?: string | null
          zip?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_subscriptions_v1: {
        Row: {
          current_period_end: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          current_period_end?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          current_period_end?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      family_members_view: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"] | null
          family_id: string | null
          id: string | null
          invitee_email: string | null
          joined_at: string | null
          member_name: string | null
          relationship: string | null
          role: string | null
          status: string | null
          user_id: string | null
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
            referencedRelation: "active_subscriptions_v1"
            referencedColumns: ["user_id"]
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
      guardian_verification_status_view: {
        Row: {
          child_id: string | null
          created_at: string | null
          guardian_email_masked: string | null
          id: string | null
          method: string | null
          status:
            | Database["public"]["Enums"]["guardian_verification_status"]
            | null
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          guardian_email_masked?: never
          id?: string | null
          method?: string | null
          status?:
            | Database["public"]["Enums"]["guardian_verification_status"]
            | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          guardian_email_masked?: never
          id?: string | null
          method?: string | null
          status?:
            | Database["public"]["Enums"]["guardian_verification_status"]
            | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_age_group: {
        Args: { user_age: number }
        Returns: Database["public"]["Enums"]["age_group"]
      }
      can_view_profile: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: boolean
      }
      ensure_chat_room: {
        Args: {
          p_age_group: Database["public"]["Enums"]["age_group"]
          p_description: string
          p_focus_area: string
          p_focus_area_key: string
          p_name: string
        }
        Returns: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at: string | null
          description: string | null
          focus_area: string
          focus_area_key: string | null
          id: string
          name: string
        }
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
      is_parent: {
        Args: { _child_id: string }
        Returns: boolean
      }
      is_parent_of: {
        Args: { _child_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { _user_id: string }
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
      app_role: "admin" | "user" | "moderator"
      content_type: "audio" | "text" | "video"
      data_deletion_status:
        | "pending"
        | "cancelled"
        | "processing"
        | "completed"
        | "failed"
      data_export_status:
        | "pending"
        | "processing"
        | "ready"
        | "failed"
        | "expired"
      guardian_verification_status:
        | "pending"
        | "verified"
        | "failed"
        | "expired"
      help_location_type: "crisis" | "therapy"
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
      app_role: ["admin", "user", "moderator"],
      content_type: ["audio", "text", "video"],
      data_deletion_status: [
        "pending",
        "cancelled",
        "processing",
        "completed",
        "failed",
      ],
      data_export_status: [
        "pending",
        "processing",
        "ready",
        "failed",
        "expired",
      ],
      guardian_verification_status: [
        "pending",
        "verified",
        "failed",
        "expired",
      ],
      help_location_type: ["crisis", "therapy"],
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
