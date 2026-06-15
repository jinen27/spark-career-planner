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
      assessment_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          progress: number
          responses: Json
          scores: Json
          status: string
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          responses?: Json
          scores?: Json
          status?: string
          updated_at?: string
          user_id: string
          version?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          responses?: Json
          scores?: Json
          status?: string
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      career_experiences: {
        Row: {
          career_slug: string
          career_title: string
          created_at: string
          enjoyment: number
          feedback: Json
          id: string
          instructions: string
          recommendation_id: string | null
          response: string
          scenario: string
          task_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          career_slug: string
          career_title: string
          created_at?: string
          enjoyment: number
          feedback?: Json
          id?: string
          instructions: string
          recommendation_id?: string | null
          response: string
          scenario: string
          task_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          career_slug?: string
          career_title?: string
          created_at?: string
          enjoyment?: number
          feedback?: Json
          id?: string
          instructions?: string
          recommendation_id?: string | null
          response?: string
          scenario?: string
          task_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_experiences_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "career_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      career_recommendations: {
        Row: {
          assessment_id: string
          career_slug: string
          career_title: string
          confidence: number
          created_at: string
          description: string
          id: string
          match_reasons: Json
          outlook: string
          pathways: Json
          preparation_experiences: Json
          rank: number
          recommended_subjects: Json
          related_professions: Json
          responsibilities: Json
          soft_skills: Json
          technical_skills: Json
          university_majors: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          career_slug: string
          career_title: string
          confidence: number
          created_at?: string
          description: string
          id?: string
          match_reasons?: Json
          outlook?: string
          pathways?: Json
          preparation_experiences?: Json
          rank: number
          recommended_subjects?: Json
          related_professions?: Json
          responsibilities?: Json
          soft_skills?: Json
          technical_skills?: Json
          university_majors?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          career_slug?: string
          career_title?: string
          confidence?: number
          created_at?: string
          description?: string
          id?: string
          match_reasons?: Json
          outlook?: string
          pathways?: Json
          preparation_experiences?: Json
          rank?: number
          recommended_subjects?: Json
          related_professions?: Json
          responsibilities?: Json
          soft_skills?: Json
          technical_skills?: Json
          university_majors?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_recommendations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      development_plans: {
        Row: {
          assessment_id: string
          category: string
          completed: boolean
          created_at: string
          description: string
          id: string
          recommendation_id: string | null
          sequence: number
          timeframe: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          category: string
          completed?: boolean
          created_at?: string
          description: string
          id?: string
          recommendation_id?: string | null
          sequence: number
          timeframe: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          category?: string
          completed?: boolean
          created_at?: string
          description?: string
          id?: string
          recommendation_id?: string | null
          sequence?: number
          timeframe?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_plans_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plans_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "career_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          country: string
          created_at: string
          current_subjects: string[]
          display_name: string
          educational_stage: string
          id: string
          preferences: Json
          school_year: string
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          current_subjects?: string[]
          display_name?: string
          educational_stage?: string
          id: string
          preferences?: Json
          school_year?: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          current_subjects?: string[]
          display_name?: string
          educational_stage?: string
          id?: string
          preferences?: Json
          school_year?: string
          updated_at?: string
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
