/** Minimal Supabase Database type for our tables. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          guest_id: string;
          website_url: string;
          domain: string;
          business_name: string | null;
          tagline: string | null;
          mission: string | null;
          selling_type: string | null;
          colors: Json | null;
          social_links: Json | null;
          logo_external_url: string | null;
          logo_storage_path: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["workspaces"]["Row"], "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          workspace_id: string;
          created_at: string;
          updated_at: string;
          external_id: string | null;
          title: string | null;
          description: string | null;
          url: string | null;
          vendor: string | null;
          price: string | null;
          images_external: Json | null;
          images_storage: Json | null;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      assets: {
        Row: {
          id: string;
          workspace_id: string;
          product_id: string | null;
          created_at: string;
          kind: string;
          external_url: string | null;
          storage_path: string | null;
          meta: Json | null;
        };
        Insert: Omit<Database["public"]["Tables"]["assets"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
      };
      creatives: {
        Row: {
          id: string;
          workspace_id: string;
          created_at: string;
          type: string | null;
          prompt: string | null;
          aspect_ratio: string | null;
          status: string | null;
          meta: Json | null;
        };
        Insert: Omit<Database["public"]["Tables"]["creatives"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["creatives"]["Insert"]>;
      };
    };
  };
}
