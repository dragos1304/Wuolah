"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface SaveBackpackInput {
  university_name: string;
  university_location: string;
  faculty_name: string;
  study_language: string;
  specialization_name: string;
  duration_years: number;
  year: number;
}

export async function saveBackpack(
  data: SaveBackpackInput
): Promise<{ error: string } | never> {
  // ── Auth check ────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    redirect("/login");
  }

  // ── Server-side validation ────────────────────────────────────────────────
  const {
    university_name,
    university_location,
    faculty_name,
    study_language,
    specialization_name,
    duration_years,
    year,
  } = data;

  if (
    !university_name?.trim() ||
    !faculty_name?.trim() ||
    !study_language?.trim() ||
    !specialization_name?.trim() ||
    !year
  ) {
    return { error: "Toate câmpurile sunt obligatorii." };
  }

  const allowedLanguages = ["RO", "EN", "HU", "DE", "FR"];
  if (!allowedLanguages.includes(study_language)) {
    return { error: "Limbă de predare invalidă." };
  }

  if (!Number.isInteger(year) || year < 1 || year > duration_years) {
    return {
      error: `Anul trebuie să fie între 1 și ${duration_years} pentru această specializare.`,
    };
  }

  // ── Find-or-create lookup entities (service role bypasses RLS on inserts) ──
  const service = createServiceClient();

  // 1. University
  const { data: uniData, error: uniError } = await service
    .from("universities")
    .upsert(
      { name: university_name, city: university_location },
      { onConflict: "name", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (uniError || !uniData) {
    console.error("upsert university", uniError);
    return { error: "Eroare la salvarea universității." };
  }
  const university_id = uniData.id;

  // 2. Faculty
  const { data: facData, error: facError } = await service
    .from("faculties")
    .upsert(
      { university_id, name: faculty_name },
      { onConflict: "university_id,name", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (facError || !facData) {
    console.error("upsert faculty", facError);
    return { error: "Eroare la salvarea facultății." };
  }
  const faculty_id = facData.id;

  // 3. Specialization (unique on faculty_id + name + study_language)
  const { data: specData, error: specError } = await service
    .from("specializations")
    .upsert(
      {
        faculty_id,
        name: specialization_name,
        study_language,
        duration_years,
      },
      {
        onConflict: "faculty_id,name,study_language",
        ignoreDuplicates: false,
      }
    )
    .select("id")
    .single();

  if (specError || !specData) {
    console.error("upsert specialization", specError);
    return { error: "Eroare la salvarea specializării." };
  }
  const specialization_id = specData.id;

  // ── Persist to user profile ───────────────────────────────────────────────
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      university_id,
      faculty_id,
      specialization_id,
      year,
      study_language,
      onboarding_complete: true,
    })
    .eq("id", user.id);

  if (profileError) {
    console.error("update user_profiles", profileError);
    return { error: "Nu s-a putut salva profilul. Încearcă din nou." };
  }

  redirect("/dashboard");
}
