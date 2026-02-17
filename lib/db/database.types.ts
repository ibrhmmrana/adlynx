/** Supabase Database type for typed client. Matches supabase/migrations schema. */

import type { Workspace, DbProduct, Asset, Creative } from "./types";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Workspace>;
        Relationships: [];
      };
      products: {
        Row: DbProduct;
        Insert: Omit<DbProduct, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<DbProduct>;
        Relationships: [];
      };
      assets: {
        Row: Asset;
        Insert: Omit<Asset, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Asset>;
        Relationships: [];
      };
      creatives: {
        Row: Creative;
        Insert: Omit<Creative, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Creative>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
