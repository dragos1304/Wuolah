"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface BackpackData {
  university_id: string;
  faculty_id: string;
  specialization_id: string;
  year: number;
}

export async function saveBackpack(
  data: BackpackData
): Promise<{ error: string } | never> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    redirect("/login");
  }

  if (
    !data.university_id ||
    !data.faculty_id ||
    !data.specialization_id ||
    !data.year ||
    data.year < 1 ||
    data.year > 6
  ) {
    return { error: "Toate câmpurile sunt obligatorii." };
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      university_id: data.university_id,
      faculty_id: data.faculty_id,
      specialization_id: data.specialization_id,
      year: data.year,
      onboarding_complete: true,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Nu s-a putut salva profilul. Încearcă din nou." };
  }

  redirect("/dashboard");
}
