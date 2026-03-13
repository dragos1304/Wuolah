"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { DocType } from "@/types/database";

interface CreateDocumentInput {
  file_url: string;
  file_size_bytes: number;
  title: string;
  professor: string;
  doc_type: DocType;
}

export async function createDocumentRecord(
  input: CreateDocumentInput
): Promise<{ documentId: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) redirect("/login");

  // Server-side validation
  const title = input.title.trim();
  const professor = input.professor.trim();

  if (!title || !professor || !input.doc_type || !input.file_url) {
    return { error: "Toate câmpurile sunt obligatorii." };
  }

  if (input.file_size_bytes > 10 * 1024 * 1024) {
    return { error: "Fișierul depășește limita de 10MB." };
  }

  // Ensure file path belongs to this user (path format: {userId}/...)
  if (!input.file_url.startsWith(user.id + "/")) {
    return { error: "Cale de fișier invalidă." };
  }

  // Fetch user's backpack context — required for the document record
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("faculty_id, specialization_id, year")
    .eq("id", user.id)
    .single();

  if (!profile?.faculty_id || !profile?.specialization_id || !profile?.year) {
    return {
      error:
        "Completează-ți profilul academic înainte de a încărca documente.",
    };
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      uploader_id: user.id,
      title,
      professor,
      doc_type: input.doc_type,
      faculty_id: profile.faculty_id,
      specialization_id: profile.specialization_id,
      year: profile.year,
      file_url: input.file_url,
      file_size_bytes: input.file_size_bytes,
      status: "PROCESSING",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Nu s-a putut crea înregistrarea. Încearcă din nou." };
  }

  return { documentId: data.id };
}

export async function activateDocument(
  documentId: string
): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) return { error: "Neautorizat." };

  if (!documentId) return { error: "ID document lipsă." };

  const { error } = await supabase
    .from("documents")
    .update({ status: "ACTIVE" })
    .eq("id", documentId)
    .eq("uploader_id", user.id); // Users can only activate their own documents

  if (error) {
    return { error: "Nu s-a putut activa documentul." };
  }

  return null;
}
