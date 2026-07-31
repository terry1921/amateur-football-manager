export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      callups: {
        Row: {
          created_at: string;
          id: string;
          match_id: string;
          player_id: string;
          status: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          match_id: string;
          player_id: string;
          status?: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          match_id?: string;
          player_id?: string;
          status?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "callups_team_match_fkey";
            columns: ["team_id", "match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["team_id", "id"];
          },
          {
            foreignKeyName: "callups_team_player_fkey";
            columns: ["team_id", "player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["team_id", "id"];
          },
        ];
      };
      match_events: {
        Row: {
          created_at: string;
          id: string;
          match_id: string;
          minute: number;
          notes: string | null;
          player_id: string;
          related_player_id: string | null;
          stoppage_time: number;
          team_id: string;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          match_id: string;
          minute: number;
          notes?: string | null;
          player_id: string;
          related_player_id?: string | null;
          stoppage_time?: number;
          team_id: string;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          match_id?: string;
          minute?: number;
          notes?: string | null;
          player_id?: string;
          related_player_id?: string | null;
          stoppage_time?: number;
          team_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_events_team_match_fkey";
            columns: ["team_id", "match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["team_id", "id"];
          },
          {
            foreignKeyName: "match_events_team_match_player_callup_fkey";
            columns: ["team_id", "match_id", "player_id"];
            isOneToOne: false;
            referencedRelation: "callups";
            referencedColumns: ["team_id", "match_id", "player_id"];
          },
          {
            foreignKeyName: "match_events_team_player_fkey";
            columns: ["team_id", "player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["team_id", "id"];
          },
          {
            foreignKeyName: "match_events_team_related_player_fkey";
            columns: ["team_id", "related_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["team_id", "id"];
          },
        ];
      };
      matches: {
        Row: {
          competition: string | null;
          created_at: string;
          home_away: string;
          id: string;
          kickoff_at: string;
          notes: string | null;
          opponent_logo_url: string | null;
          opponent_name: string;
          opponent_score: number | null;
          round: string | null;
          season_id: string;
          status: string;
          team_id: string;
          team_score: number | null;
          updated_at: string;
          venue: string | null;
        };
        Insert: {
          competition?: string | null;
          created_at?: string;
          home_away: string;
          id?: string;
          kickoff_at: string;
          notes?: string | null;
          opponent_logo_url?: string | null;
          opponent_name: string;
          opponent_score?: number | null;
          round?: string | null;
          season_id: string;
          status?: string;
          team_id: string;
          team_score?: number | null;
          updated_at?: string;
          venue?: string | null;
        };
        Update: {
          competition?: string | null;
          created_at?: string;
          home_away?: string;
          id?: string;
          kickoff_at?: string;
          notes?: string | null;
          opponent_logo_url?: string | null;
          opponent_name?: string;
          opponent_score?: number | null;
          round?: string | null;
          season_id?: string;
          status?: string;
          team_id?: string;
          team_score?: number | null;
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "matches_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_team_season_fkey";
            columns: ["team_id", "season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["team_id", "id"];
          },
        ];
      };
      players: {
        Row: {
          created_at: string;
          first_name: string;
          id: string;
          last_name: string | null;
          nickname: string | null;
          photo_url: string | null;
          position: string;
          shirt_number: number | null;
          status: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          first_name: string;
          id?: string;
          last_name?: string | null;
          nickname?: string | null;
          photo_url?: string | null;
          position: string;
          shirt_number?: number | null;
          status?: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          first_name?: string;
          id?: string;
          last_name?: string | null;
          nickname?: string | null;
          photo_url?: string | null;
          position?: string;
          shirt_number?: number | null;
          status?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          created_at: string;
          end_date: string | null;
          id: string;
          name: string;
          start_date: string | null;
          status: string;
          team_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_date?: string | null;
          id?: string;
          name: string;
          start_date?: string | null;
          status?: string;
          team_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_date?: string | null;
          id?: string;
          name?: string;
          start_date?: string | null;
          status?: string;
          team_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          city: string | null;
          country: string | null;
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          owner_id: string;
          primary_color: string | null;
          secondary_color: string | null;
          short_name: string | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          owner_id: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          short_name?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          owner_id?: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          short_name?: string | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_season: {
        Args: { target_season_id: string };
        Returns: {
          created_at: string;
          end_date: string | null;
          id: string;
          name: string;
          start_date: string | null;
          status: string;
          team_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "seasons";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      can_delete_owned_match: {
        Args: { target_match_id: string; target_team_id: string };
        Returns: boolean;
      };
      complete_match_with_events: {
        Args: {
          event_rows: Json;
          final_opponent_score: number;
          final_team_score: number;
          target_match_id: string;
        };
        Returns: Json;
      };
      get_statistics_snapshot: {
        Args: { target_season_id?: string | null; target_team_id: string };
        Returns: Json;
      };
      get_player_statistics_detail: {
        Args: {
          target_player_id: string;
          target_season_id?: string | null;
          target_team_id: string;
        };
        Returns: Json;
      };
      replace_match_callup: {
        Args: { selected_player_ids: string[]; target_match_id: string };
        Returns: {
          created_at: string;
          id: string;
          match_id: string;
          player_id: string;
          status: string;
          team_id: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "callups";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
