import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DocumentCard from "@/components/DocumentCard";

export const metadata = {
  title: "Acasă — Wuolah Romania",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      `
      full_name,
      year,
      faculty_id,
      specialization_id,
      universities ( name ),
      faculties ( name ),
      specializations ( name )
    `
    )
    .eq("id", user.id)
    .single();

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  // Fetch documents matching user's backpack context
  let documents: {
    id: string;
    title: string;
    professor: string;
    doc_type: string;
    download_count: number;
    created_at: string;
  }[] = [];

  if (profile?.faculty_id && profile?.specialization_id) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, title, professor, doc_type, download_count, created_at")
      .eq("status", "ACTIVE")
      .eq("faculty_id", profile.faculty_id)
      .eq("specialization_id", profile.specialization_id)
      .order("created_at", { ascending: false })
      .limit(20);

    documents = docs ?? [];
  }

  const displayName =
    profile?.full_name ?? user.email?.split("@")[0] ?? "Student";

  const university =
    (profile?.universities as { name: string } | null)?.name ?? null;
  const faculty =
    (profile?.faculties as { name: string } | null)?.name ?? null;
  const specialization =
    (profile?.specializations as { name: string } | null)?.name ?? null;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-deep-blue">
            Bună, {displayName}!
          </h1>
          {university && (
            <p className="text-sm text-medium-gray mt-1">
              {university}
              {faculty ? ` · ${faculty}` : ""}
              {profile?.year ? ` · Anul ${profile.year}` : ""}
            </p>
          )}
        </div>

        <Link
          href="/upload"
          className="inline-flex items-center gap-2 bg-accent-orange text-white font-semibold px-5 py-2.5 rounded-full hover:bg-orange-600 transition-colors text-sm self-start sm:self-auto"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Încarcă document
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          label="Sold portofel"
          value={`${(wallet?.balance ?? 0).toFixed(2)} RON`}
          accent
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          }
        />
        <StatCard
          label="Specializare"
          value={specialization ?? "—"}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          }
        />
        <StatCard
          label="An de studiu"
          value={profile?.year ? `Anul ${profile.year}` : "—"}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
      </div>

      {/* Documents feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-deep-blue">
            Documente recente
          </h2>
          {specialization && (
            <span className="text-xs text-medium-gray bg-white border border-gray-100 rounded-full px-3 py-1">
              {specialization}
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-14 h-14 bg-light-gray rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-7 h-7 text-medium-gray"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="font-semibold text-deep-blue mb-1">
              Niciun document disponibil încă
            </p>
            <p className="text-sm text-medium-gray mb-6">
              Fii primul care încarcă materiale pentru specializarea ta!
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-deep-blue text-white font-medium px-5 py-2.5 rounded-full hover:bg-blue-900 transition-colors text-sm"
            >
              Încarcă primul document
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                title={doc.title}
                professor={doc.professor}
                docType={doc.doc_type}
                downloadCount={doc.download_count}
                createdAt={doc.created_at}
                isLoggedIn={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 shadow-sm border flex flex-col gap-3
        ${accent ? "bg-deep-blue border-deep-blue" : "bg-white border-gray-100"}`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center
          ${accent ? "bg-white/10 text-accent-orange" : "bg-light-gray text-deep-blue"}`}
      >
        {icon}
      </div>
      <div>
        <p
          className={`text-xs font-medium ${accent ? "text-white/60" : "text-medium-gray"}`}
        >
          {label}
        </p>
        <p
          className={`text-base font-bold mt-0.5 truncate ${accent ? "text-white" : "text-deep-blue"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
