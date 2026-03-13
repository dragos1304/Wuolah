import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BackpackForm from "./BackpackForm";

export const metadata = {
  title: "Configurează Rucsacul — Wuolah Romania",
};

export default async function BackpackPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: universities } = await supabase
    .from("universities")
    .select("id, name, city")
    .order("name");

  return (
    <div className="min-h-screen bg-light-gray flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8 w-full max-w-lg">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-deep-blue mb-4">
          <svg
            className="w-7 h-7 text-accent-orange"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-deep-blue">
          Configurează-ți{" "}
          <span className="text-accent-orange">Rucsacul</span>
        </h1>
        <p className="mt-2 text-medium-gray text-sm leading-relaxed max-w-sm mx-auto">
          Spune-ne unde studiezi ca să-ți afișăm materiale relevante pentru
          cursurile tale.
        </p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-lg">
        <BackpackForm universities={universities ?? []} />
      </div>

      <p className="mt-6 text-xs text-medium-gray text-center max-w-xs">
        Poți modifica aceste informații oricând din{" "}
        <span className="font-medium text-deep-blue">Setări</span>.
      </p>
    </div>
  );
}
