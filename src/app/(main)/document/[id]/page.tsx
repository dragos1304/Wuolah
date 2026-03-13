import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import DownloadButton from "@/components/DownloadButton";

const DOC_TYPE_LABELS: Record<string, string> = {
  curs: "📖 Curs",
  seminar: "✏️ Seminar",
  laborator: "🔬 Laborator",
  examen: "📝 Examen",
  fisa: "📋 Fișă",
  altele: "📎 Altele",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("title")
    .eq("id", id)
    .eq("status", "ACTIVE")
    .single();

  return {
    title: doc ? `${doc.title} — Wuolah Romania` : "Document negăsit",
  };
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: doc, error } = await supabase
    .from("documents")
    .select(
      `
      id,
      title,
      professor,
      doc_type,
      download_count,
      file_size_bytes,
      created_at,
      faculties ( name ),
      specializations ( name )
    `
    )
    .eq("id", id)
    .eq("status", "ACTIVE")
    .single();

  if (error || !doc) notFound();

  const faculty = (doc.faculties as { name: string } | null)?.name ?? "—";
  const specialization =
    (doc.specializations as { name: string } | null)?.name ?? "—";
  const typeLabel = DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type;
  const fileSizeMB = doc.file_size_bytes
    ? `${(doc.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
    : null;
  const createdDate = new Date(doc.created_at).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-medium-gray hover:text-deep-blue transition-colors mb-6"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Înapoi la Acasă
      </Link>

      {/* Document card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-deep-blue to-blue-900 px-6 py-8 sm:px-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
              <svg
                className="w-7 h-7 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 4h5v5a1 1 0 001 1h5v10H6V4z" />
                <path d="M8 13h8v1H8zm0 3h5v1H8z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                {doc.title}
              </h1>
              <p className="text-white/60 text-sm mt-1">{doc.professor}</p>
            </div>
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 border-b border-gray-100">
          <MetaCell label="Tip" value={typeLabel} />
          <MetaCell label="Descărcări" value={String(doc.download_count)} />
          <MetaCell label="Facultate" value={faculty} />
          <MetaCell label="Specializare" value={specialization} />
        </div>

        {/* Details + Download */}
        <div className="px-6 py-6 sm:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-medium-gray">
            <span>Publicat {createdDate}</span>
            {fileSizeMB && <span>· {fileSizeMB}</span>}
            <span>· PDF</span>
          </div>

          <DownloadButton
            documentId={doc.id}
            documentTitle={doc.title}
            isLoggedIn={!!user}
          />
        </div>

        {/* Revenue info */}
        <div className="mx-6 sm:mx-8 mb-6 p-4 bg-light-gray rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <svg
              className="w-4 h-4 text-accent-orange"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-deep-blue">
              Descărcarea este gratuită
            </p>
            <p className="text-xs text-medium-gray mt-0.5">
              Un scurt anunț de 5 secunde va fi afișat înainte de descărcare.
              Autorul primește{" "}
              <span className="font-semibold text-accent-orange">
                +0.05 RON
              </span>{" "}
              pentru fiecare descărcare unică.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] uppercase tracking-wider text-medium-gray font-medium">
        {label}
      </p>
      <p className="text-sm font-semibold text-deep-blue mt-1 truncate">
        {value}
      </p>
    </div>
  );
}
