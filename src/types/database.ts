export type DocType =
  | "curs"
  | "seminar"
  | "laborator"
  | "examen"
  | "fisa"
  | "altele";

export type DocStatus = "PROCESSING" | "ACTIVE" | "REJECTED";
export type WithdrawalMethod = "iban" | "revolut";
export type WithdrawalStatus = "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";

export interface Database {
  public: {
    Tables: {
      universities: {
        Row: { id: string; name: string; city: string; created_at: string };
        Insert: { id?: string; name: string; city: string; created_at?: string };
        Update: { id?: string; name?: string; city?: string };
        Relationships: [];
      };
      faculties: {
        Row: { id: string; university_id: string; name: string; created_at: string };
        Insert: { id?: string; university_id: string; name: string; created_at?: string };
        Update: { id?: string; university_id?: string; name?: string };
        Relationships: [
          {
            foreignKeyName: "faculties_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          }
        ];
      };
      specializations: {
        Row: {
          id: string;
          faculty_id: string;
          name: string;
          study_language: string;
          duration_years: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          faculty_id: string;
          name: string;
          study_language?: string;
          duration_years?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          faculty_id?: string;
          name?: string;
          study_language?: string;
          duration_years?: number;
        };
        Relationships: [
          {
            foreignKeyName: "specializations_faculty_id_fkey";
            columns: ["faculty_id"];
            isOneToOne: false;
            referencedRelation: "faculties";
            referencedColumns: ["id"];
          }
        ];
      };
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          university_id: string | null;
          faculty_id: string | null;
          specialization_id: string | null;
          year: number | null;
          study_language: string | null;
          avatar_url: string | null;
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          university_id?: string | null;
          faculty_id?: string | null;
          specialization_id?: string | null;
          year?: number | null;
          study_language?: string | null;
          avatar_url?: string | null;
          onboarding_complete?: boolean;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          university_id?: string | null;
          faculty_id?: string | null;
          specialization_id?: string | null;
          year?: number | null;
          study_language?: string | null;
          avatar_url?: string | null;
          onboarding_complete?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_profiles_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_profiles_faculty_id_fkey";
            columns: ["faculty_id"];
            isOneToOne: false;
            referencedRelation: "faculties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_profiles_specialization_id_fkey";
            columns: ["specialization_id"];
            isOneToOne: false;
            referencedRelation: "specializations";
            referencedColumns: ["id"];
          }
        ];
      };
      documents: {
        Row: {
          id: string;
          uploader_id: string;
          title: string;
          professor: string;
          doc_type: DocType;
          faculty_id: string;
          specialization_id: string;
          year: number;
          file_url: string;
          file_hash: string | null;
          file_size_bytes: number | null;
          status: DocStatus;
          download_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          uploader_id: string;
          title: string;
          professor: string;
          doc_type: DocType;
          faculty_id: string;
          specialization_id: string;
          year: number;
          file_url: string;
          file_hash?: string | null;
          file_size_bytes?: number | null;
          status?: DocStatus;
          download_count?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          professor?: string;
          doc_type?: DocType;
          status?: DocStatus;
          download_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "documents_uploader_id_fkey";
            columns: ["uploader_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_faculty_id_fkey";
            columns: ["faculty_id"];
            isOneToOne: false;
            referencedRelation: "faculties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_specialization_id_fkey";
            columns: ["specialization_id"];
            isOneToOne: false;
            referencedRelation: "specializations";
            referencedColumns: ["id"];
          }
        ];
      };
      downloads: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          credited: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          credited?: boolean;
          created_at?: string;
        };
        Update: { credited?: boolean };
        Relationships: [
          {
            foreignKeyName: "downloads_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "downloads_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          }
        ];
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: { id?: string; user_id: string; balance?: number; created_at?: string };
        Update: { balance?: number };
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      withdrawal_requests: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          method: WithdrawalMethod;
          iban_or_revolut: string;
          status: WithdrawalStatus;
          admin_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          method: WithdrawalMethod;
          iban_or_revolut: string;
          status?: WithdrawalStatus;
          admin_note?: string | null;
          created_at?: string;
        };
        Update: {
          amount?: number;
          method?: WithdrawalMethod;
          iban_or_revolut?: string;
          status?: WithdrawalStatus;
          admin_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      credit_download: {
        Args: { p_user_id: string; p_document_id: string };
        Returns: {
          success: boolean;
          credited: boolean;
          is_duplicate: boolean;
          is_own_doc: boolean;
          reason?: string;
        };
      };
    };
    Enums: {
      doc_type: DocType;
      doc_status: DocStatus;
      withdrawal_method: WithdrawalMethod;
      withdrawal_status: WithdrawalStatus;
    };
  };
}
