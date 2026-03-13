import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UploadForm from "./UploadForm";

export const metadata = {
  title: "Încarcă Document — Wuolah Romania",
};

export default async function UploadPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("faculty_id, specialization_id, year, onboarding_complete, specializations(name)")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_complete) redirect("/backpack");

  const specializationName =
    (profile?.specializations as { name: string } | null)?.name ?? null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-deep-blue">
          Încarcă Document
        </h1>
        <p className="text-sm text-medium-gray mt-1">
          Împărtășește materialele tale de studiu și câștigă{" "}
          <span className="text-accent-orange font-semibold">0.05 RON</span>{" "}
          pentru fiecare descărcare unică.
          {specializationName && (
            <> Documentul va fi vizibil studenților de la{" "}
              <span className="font-medium text-dark-gray">{specializationName}</span>.
            </>
          )}
        </p>
      </div>

      <UploadForm userId={user.id} />
    </div>
  );
}
