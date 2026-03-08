export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      villages: {
        Row: {
          id: string
          name: string
          district: string
          state: string
          country: string
          description: string | null
          population: number | null
          logo_url: string | null
          banner_url: string | null
          latitude: number | null
          longitude: number | null
          theme_color: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['villages']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['villages']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          village_id: string | null
          full_name: string
          mobile_number: string | null
          occupation: string | null
          skills: string[] | null
          avatar_url: string | null
          bio: string | null
          status: 'pending' | 'active' | 'banned' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          village_id: string | null
          role: 'super_admin' | 'admin' | 'moderator' | 'user'
          assigned_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_roles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>
      }
      posts: {
        Row: {
          id: string
          village_id: string
          author_id: string
          content: string
          post_type: 'text' | 'image' | 'video'
          media_urls: string[] | null
          location_tag: string | null
          is_pinned: boolean
          is_announcement: boolean
          is_deleted: boolean
          likes_count: number
          comments_count: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['posts']['Row'], 'id' | 'created_at' | 'updated_at' | 'likes_count' | 'comments_count'>
        Update: Partial<Database['public']['Tables']['posts']['Insert']>
      }
      comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          content: string
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['comments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['comments']['Insert']>
      }
      likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['likes']['Row'], 'id' | 'created_at'>
        Update: never
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          village_id: string | null
          title: string
          message: string
          type: 'announcement' | 'comment' | 'project_update' | 'event' | 'complaint_update' | 'emergency' | 'general'
          reference_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      custom_roles: {
        Row: {
          id: string
          village_id: string
          name: string
          description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['custom_roles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['custom_roles']['Insert']>
      }
      media_files: {
        Row: {
          id: string
          user_id: string
          village_id: string | null
          file_name: string
          file_url: string
          file_type: string
          file_size: number | null
          reference_type: string | null
          reference_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['media_files']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['media_files']['Insert']>
      }
    }
    Views: Record<never, never>
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: 'super_admin' | 'admin' | 'moderator' | 'user'
      user_status: 'pending' | 'active' | 'banned' | 'suspended'
      post_type: 'text' | 'image' | 'video'
      notification_type: 'announcement' | 'comment' | 'project_update' | 'event' | 'complaint_update' | 'emergency' | 'general'
    }
  }
}
