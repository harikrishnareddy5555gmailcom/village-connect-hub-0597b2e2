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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          performed_by: string
          performed_by_name: string | null
          village_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          performed_by: string
          performed_by_name?: string | null
          village_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          performed_by?: string
          performed_by_name?: string | null
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          image_urls: string[] | null
          is_verified: boolean
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string
          owner_name: string | null
          phone: string | null
          updated_at: string
          village_id: string
        }
        Insert: {
          address?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id: string
          owner_name?: string | null
          phone?: string | null
          updated_at?: string
          village_id: string
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string
          owner_name?: string | null
          phone?: string | null
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "businesses_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_profiles_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          latitude: number | null
          location_tag: string | null
          longitude: number | null
          reporter_id: string
          status: string
          title: string
          updated_at: string
          village_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          latitude?: number | null
          location_tag?: string | null
          longitude?: number | null
          reporter_id: string
          status?: string
          title: string
          updated_at?: string
          village_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          latitude?: number | null
          location_tag?: string | null
          longitude?: number | null
          reporter_id?: string
          status?: string
          title?: string
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "complaints_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "complaints_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          village_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          village_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_replies: {
        Row: {
          author_id: string
          content: string
          created_at: string
          discussion_id: string
          id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          discussion_id: string
          id?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          discussion_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "discussion_replies_author_id_profiles_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          id: string
          is_closed: boolean
          title: string
          updated_at: string
          village_id: string
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          title: string
          updated_at?: string
          village_id: string
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          title?: string
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "discussions_author_id_profiles_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "discussions_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_campaigns: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_urls: string[] | null
          is_active: boolean
          target_amount: number | null
          title: string
          updated_at: string
          village_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean
          target_amount?: number | null
          title: string
          updated_at?: string
          village_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean
          target_amount?: number | null
          title?: string
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_campaigns_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          added_by: string
          amount: number
          campaign_id: string | null
          created_at: string
          currency: string
          date: string
          donor_id: string | null
          donor_name: string
          id: string
          is_anonymous: boolean
          notes: string | null
          payment_method: string
          project_id: string | null
          proof_url: string | null
          updated_at: string
          village_id: string
        }
        Insert: {
          added_by: string
          amount: number
          campaign_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          donor_id?: string | null
          donor_name: string
          id?: string
          is_anonymous?: boolean
          notes?: string | null
          payment_method?: string
          project_id?: string | null
          proof_url?: string | null
          updated_at?: string
          village_id: string
        }
        Update: {
          added_by?: string
          amount?: number
          campaign_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          donor_id?: string | null
          donor_name?: string
          id?: string
          is_anonymous?: boolean
          notes?: string | null
          payment_method?: string
          project_id?: string | null
          proof_url?: string | null
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "donation_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "donations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      event_programs: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_id: string
          id: string
          start_time: string | null
          title: string
          updated_at: string
          village_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          start_time?: string | null
          title: string
          updated_at?: string
          village_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          start_time?: string | null
          title?: string
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_programs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_programs_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          id: string
          location_tag: string | null
          title: string
          updated_at: string
          village_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          id?: string
          location_tag?: string | null
          title: string
          updated_at?: string
          village_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          id?: string
          location_tag?: string | null
          title?: string
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "events_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "events_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          date: string
          description: string
          id: string
          notes: string | null
          project_id: string | null
          proof_url: string | null
          responsible_admin: string
          updated_at: string
          village_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          currency?: string
          date?: string
          description: string
          id?: string
          notes?: string | null
          project_id?: string | null
          proof_url?: string | null
          responsible_admin: string
          updated_at?: string
          village_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          date?: string
          description?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          proof_url?: string | null
          responsible_admin?: string
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_responsible_admin_fkey"
            columns: ["responsible_admin"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "expenses_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_audit_log: {
        Row: {
          action: string
          changed_by: string
          created_at: string
          edit_request_id: string | null
          id: string
          new_data: Json | null
          previous_data: Json | null
          record_id: string
          record_type: string
          village_id: string
        }
        Insert: {
          action: string
          changed_by: string
          created_at?: string
          edit_request_id?: string | null
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          record_id: string
          record_type: string
          village_id: string
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string
          edit_request_id?: string | null
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          record_id?: string
          record_type?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fund_audit_log_edit_request_id_fkey"
            columns: ["edit_request_id"]
            isOneToOne: false
            referencedRelation: "fund_edit_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_audit_log_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_edit_requests: {
        Row: {
          created_at: string
          id: string
          reason: string
          record_id: string
          record_type: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          village_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          record_id: string
          record_type: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          village_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          record_id?: string
          record_type?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_edit_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fund_edit_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fund_edit_requests_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      game_commentary: {
        Row: {
          commentary: string
          created_at: string
          created_by: string
          game_id: string
          id: string
          over_marker: string | null
          team_id: string | null
        }
        Insert: {
          commentary: string
          created_at?: string
          created_by: string
          game_id: string
          id?: string
          over_marker?: string | null
          team_id?: string | null
        }
        Update: {
          commentary?: string
          created_at?: string
          created_by?: string
          game_id?: string
          id?: string
          over_marker?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_commentary_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "game_commentary_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_commentary_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_cricket_player_stats: {
        Row: {
          balls_faced: number
          dismissed_by_member_id: string | null
          fours: number
          game_id: string
          id: string
          is_out: boolean
          maidens: number
          member_id: string
          no_balls: number
          overs_bowled_balls: number
          run_outs_involved: number
          runs_conceded: number
          runs_scored: number
          sixes: number
          team_id: string
          updated_at: string
          wicket_type: string | null
          wickets_taken: number
          wides: number
        }
        Insert: {
          balls_faced?: number
          dismissed_by_member_id?: string | null
          fours?: number
          game_id: string
          id?: string
          is_out?: boolean
          maidens?: number
          member_id: string
          no_balls?: number
          overs_bowled_balls?: number
          run_outs_involved?: number
          runs_conceded?: number
          runs_scored?: number
          sixes?: number
          team_id: string
          updated_at?: string
          wicket_type?: string | null
          wickets_taken?: number
          wides?: number
        }
        Update: {
          balls_faced?: number
          dismissed_by_member_id?: string | null
          fours?: number
          game_id?: string
          id?: string
          is_out?: boolean
          maidens?: number
          member_id?: string
          no_balls?: number
          overs_bowled_balls?: number
          run_outs_involved?: number
          runs_conceded?: number
          runs_scored?: number
          sixes?: number
          team_id?: string
          updated_at?: string
          wicket_type?: string | null
          wickets_taken?: number
          wides?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_cricket_player_stats_dismissed_by_member_id_fkey"
            columns: ["dismissed_by_member_id"]
            isOneToOne: false
            referencedRelation: "game_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_cricket_player_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_cricket_player_stats_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "game_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_cricket_player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_cricket_states: {
        Row: {
          batting_team_id: string | null
          bowler_member_id: string | null
          bowling_team_id: string | null
          current_ball_in_over: number
          current_over: number
          game_id: string
          id: string
          last_out_member_id: string | null
          last_wicket_type: string | null
          non_striker_member_id: string | null
          striker_member_id: string | null
          updated_at: string
        }
        Insert: {
          batting_team_id?: string | null
          bowler_member_id?: string | null
          bowling_team_id?: string | null
          current_ball_in_over?: number
          current_over?: number
          game_id: string
          id?: string
          last_out_member_id?: string | null
          last_wicket_type?: string | null
          non_striker_member_id?: string | null
          striker_member_id?: string | null
          updated_at?: string
        }
        Update: {
          batting_team_id?: string | null
          bowler_member_id?: string | null
          bowling_team_id?: string | null
          current_ball_in_over?: number
          current_over?: number
          game_id?: string
          id?: string
          last_out_member_id?: string | null
          last_wicket_type?: string | null
          non_striker_member_id?: string | null
          striker_member_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_cricket_states_batting_team_id_fkey"
            columns: ["batting_team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_cricket_states_bowler_member_id_fkey"
            columns: ["bowler_member_id"]
            isOneToOne: false
            referencedRelation: "game_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_cricket_states_bowling_team_id_fkey"
            columns: ["bowling_team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_cricket_states_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_cricket_states_last_out_member_id_fkey"
            columns: ["last_out_member_id"]
            isOneToOne: false
            referencedRelation: "game_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_cricket_states_non_striker_member_id_fkey"
            columns: ["non_striker_member_id"]
            isOneToOne: false
            referencedRelation: "game_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_cricket_states_striker_member_id_fkey"
            columns: ["striker_member_id"]
            isOneToOne: false
            referencedRelation: "game_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      game_memories: {
        Row: {
          created_at: string
          description: string | null
          game_id: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          game_id: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          game_id?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_memories_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_memories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_permissions: {
        Row: {
          can_add_commentary: boolean
          can_control_timer: boolean
          can_manage_game: boolean
          can_manage_teams: boolean
          can_update_scores: boolean
          can_upload_memories: boolean
          created_at: string
          game_id: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          can_add_commentary?: boolean
          can_control_timer?: boolean
          can_manage_game?: boolean
          can_manage_teams?: boolean
          can_update_scores?: boolean
          can_upload_memories?: boolean
          created_at?: string
          game_id: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          can_add_commentary?: boolean
          can_control_timer?: boolean
          can_manage_game?: boolean
          can_manage_teams?: boolean
          can_update_scores?: boolean
          can_upload_memories?: boolean
          created_at?: string
          game_id?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_permissions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "game_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_player_actions: {
        Row: {
          action_type: string
          created_at: string
          created_by: string
          description: string | null
          game_id: string
          id: string
          member_id: string
          over_marker: string | null
          points: number
          team_id: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          game_id: string
          id?: string
          member_id: string
          over_marker?: string | null
          points?: number
          team_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          game_id?: string
          id?: string
          member_id?: string
          over_marker?: string | null
          points?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_player_actions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_player_actions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "game_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_player_actions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_substitutions: {
        Row: {
          created_at: string
          created_by: string | null
          game_id: string
          id: string
          note: string | null
          player_in_name: string
          player_out_name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          game_id: string
          id?: string
          note?: string | null
          player_in_name: string
          player_out_name: string
          team_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          game_id?: string
          id?: string
          note?: string | null
          player_in_name?: string
          player_out_name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_substitutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "game_substitutions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_substitutions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_team_members: {
        Row: {
          created_at: string
          created_by: string | null
          game_id: string
          id: string
          is_playing: boolean
          jersey_number: string | null
          member_name: string
          role: string
          team_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          game_id: string
          id?: string
          is_playing?: boolean
          jersey_number?: string | null
          member_name: string
          role?: string
          team_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          game_id?: string
          id?: string
          is_playing?: boolean
          jersey_number?: string | null
          member_name?: string
          role?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_team_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "game_team_members_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      game_teams: {
        Row: {
          captain_name: string | null
          color_tag: string | null
          created_at: string
          created_by: string | null
          game_id: string
          id: string
          is_winner: boolean
          name: string
          overs: number
          score_adjustment: number
          wickets: number
        }
        Insert: {
          captain_name?: string | null
          color_tag?: string | null
          created_at?: string
          created_by?: string | null
          game_id: string
          id?: string
          is_winner?: boolean
          name: string
          overs?: number
          score_adjustment?: number
          wickets?: number
        }
        Update: {
          captain_name?: string | null
          color_tag?: string | null
          created_at?: string
          created_by?: string | null
          game_id?: string
          id?: string
          is_winner?: boolean
          name?: string
          overs?: number
          score_adjustment?: number
          wickets?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "game_teams_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_timers: {
        Row: {
          duration: string | null
          end_time: string | null
          game_id: string
          id: string
          is_active: boolean
          paused_elapsed_seconds: number | null
          start_time: string | null
          timer_mode: string | null
        }
        Insert: {
          duration?: string | null
          end_time?: string | null
          game_id: string
          id?: string
          is_active?: boolean
          paused_elapsed_seconds?: number | null
          start_time?: string | null
          timer_mode?: string | null
        }
        Update: {
          duration?: string | null
          end_time?: string | null
          game_id?: string
          id?: string
          is_active?: boolean
          paused_elapsed_seconds?: number | null
          start_time?: string | null
          timer_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_timers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          festival_date: string | null
          game_type: string
          id: string
          match_duration_minutes: number | null
          max_players_per_team: number | null
          overs_limit: number | null
          rules_summary: string | null
          scoring_mode: string
          status: string
          target_score: number | null
          title: string
          updated_at: string
          venue: string | null
          village_id: string
          winner_team_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          festival_date?: string | null
          game_type?: string
          id?: string
          match_duration_minutes?: number | null
          max_players_per_team?: number | null
          overs_limit?: number | null
          rules_summary?: string | null
          scoring_mode?: string
          status?: string
          target_score?: number | null
          title: string
          updated_at?: string
          venue?: string | null
          village_id: string
          winner_team_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          festival_date?: string | null
          game_type?: string
          id?: string
          match_duration_minutes?: number | null
          max_players_per_team?: number | null
          overs_limit?: number | null
          rules_summary?: string | null
          scoring_mode?: string
          status?: string
          target_score?: number | null
          title?: string
          updated_at?: string
          venue?: string | null
          village_id?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "games_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      media_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          reference_id: string | null
          reference_type: string | null
          user_id: string
          village_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
          village_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          author_id: string
          caption: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          image_urls: string[]
          is_featured: boolean | null
          is_hidden: boolean | null
          location_tag: string | null
          updated_at: string | null
          village_id: string
        }
        Insert: {
          author_id: string
          caption?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          image_urls?: string[]
          is_featured?: boolean | null
          is_hidden?: boolean | null
          location_tag?: string | null
          updated_at?: string | null
          village_id: string
        }
        Update: {
          author_id?: string
          caption?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          image_urls?: string[]
          is_featured?: boolean | null
          is_hidden?: boolean | null
          location_tag?: string | null
          updated_at?: string | null
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "memories_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "memories_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_comments: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          memory_id: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          memory_id?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          memory_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_comments_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_likes: {
        Row: {
          created_at: string | null
          id: string
          memory_id: string | null
          reaction: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          memory_id?: string | null
          reaction?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          memory_id?: string | null
          reaction?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_likes_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          village_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
          village_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          is_active: boolean
          options: Json
          question: string
          updated_at: string
          village_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          options?: Json
          question: string
          updated_at?: string
          village_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          options?: Json
          question?: string
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "polls_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          comments_count: number
          content: string
          created_at: string
          id: string
          is_announcement: boolean
          is_deleted: boolean
          is_pinned: boolean
          likes_count: number
          location_tag: string | null
          media_urls: string[] | null
          post_type: Database["public"]["Enums"]["post_type"]
          updated_at: string
          village_id: string
        }
        Insert: {
          author_id: string
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          is_announcement?: boolean
          is_deleted?: boolean
          is_pinned?: boolean
          likes_count?: number
          location_tag?: string | null
          media_urls?: string[] | null
          post_type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          village_id: string
        }
        Update: {
          author_id?: string
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          is_announcement?: boolean
          is_deleted?: boolean
          is_pinned?: boolean
          likes_count?: number
          location_tag?: string | null
          media_urls?: string[] | null
          post_type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_profiles_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          gender: string | null
          id: string
          mobile_number: string | null
          occupation: string | null
          show_email: boolean
          show_mobile: boolean
          show_occupation: boolean
          skills: string[] | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
          village_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name: string
          gender?: string | null
          id?: string
          mobile_number?: string | null
          occupation?: string | null
          show_email?: boolean
          show_mobile?: boolean
          show_occupation?: boolean
          skills?: string[] | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
          village_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          gender?: string | null
          id?: string
          mobile_number?: string | null
          occupation?: string | null
          show_email?: boolean
          show_mobile?: boolean
          show_occupation?: boolean
          skills?: string[] | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          project_id: string
          update_type: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          project_id: string
          update_type?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_author_id_profiles_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          progress: number
          start_date: string | null
          status: string
          title: string
          updated_at: string
          village_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          progress?: number
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          village_id: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          progress?: number
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          created_by: string | null
          description: string | null
          game_id: string
          id: string
          over_marker: string | null
          points: number
          score_type: string
          team_id: string | null
          timestamp: string
        }
        Insert: {
          created_by?: string | null
          description?: string | null
          game_id: string
          id?: string
          over_marker?: string | null
          points?: number
          score_type?: string
          team_id?: string | null
          timestamp?: string
        }
        Update: {
          created_by?: string | null
          description?: string | null
          game_id?: string
          id?: string
          over_marker?: string | null
          points?: number
          score_type?: string
          team_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "scores_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role_in_team: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role_in_team?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role_in_team?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      team_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          progress: number
          status: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          progress?: number
          status?: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          progress?: number
          status?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "team_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "team_tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          village_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          village_id: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "teams_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          village_id: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          village_id?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      villages: {
        Row: {
          banner_url: string | null
          country: string
          created_at: string
          description: string | null
          district: string
          donations_enabled: boolean
          id: string
          is_active: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          population: number | null
          qr_code_url: string | null
          reset_via_email_enabled: boolean
          reset_via_otp_enabled: boolean
          state: string
          theme_color: string | null
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          banner_url?: string | null
          country?: string
          created_at?: string
          description?: string | null
          district: string
          donations_enabled?: boolean
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          population?: number | null
          qr_code_url?: string | null
          reset_via_email_enabled?: boolean
          reset_via_otp_enabled?: boolean
          state: string
          theme_color?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          banner_url?: string | null
          country?: string
          created_at?: string
          description?: string | null
          district?: string
          donations_enabled?: boolean
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          population?: number | null
          qr_code_url?: string | null
          reset_via_email_enabled?: boolean
          reset_via_otp_enabled?: boolean
          state?: string
          theme_color?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_memory_media: {
        Args: { media_url: string; memory_id: string }
        Returns: undefined
      }
      get_super_admin_ids: { Args: never; Returns: string[] }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      restore_memory: {
        Args: { p_memory_id: string }
        Returns: {
          author_id: string
          caption: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          image_urls: string[]
          is_featured: boolean | null
          is_hidden: boolean | null
          location_tag: string | null
          updated_at: string | null
          village_id: string
        }
        SetofOptions: {
          from: "*"
          to: "memories"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      soft_delete_memory: {
        Args: { p_memory_id: string }
        Returns: {
          author_id: string
          caption: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          image_urls: string[]
          is_featured: boolean | null
          is_hidden: boolean | null
          location_tag: string | null
          updated_at: string | null
          village_id: string
        }
        SetofOptions: {
          from: "*"
          to: "memories"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "moderator" | "user"
      complaint_status: "reported" | "in_progress" | "resolved"
      notification_type:
        | "announcement"
        | "comment"
        | "project_update"
        | "event"
        | "complaint_update"
        | "emergency"
        | "general"
      post_type: "text" | "image" | "video"
      project_status: "planned" | "in_progress" | "completed" | "delayed"
      user_status: "pending" | "active" | "banned" | "suspended"
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
      app_role: ["super_admin", "admin", "moderator", "user"],
      complaint_status: ["reported", "in_progress", "resolved"],
      notification_type: [
        "announcement",
        "comment",
        "project_update",
        "event",
        "complaint_update",
        "emergency",
        "general",
      ],
      post_type: ["text", "image", "video"],
      project_status: ["planned", "in_progress", "completed", "delayed"],
      user_status: ["pending", "active", "banned", "suspended"],
    },
  },
} as const
