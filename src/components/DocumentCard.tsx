import Link from "next/link";
import DownloadButton from "./DownloadButton";

const DOC_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  curs: { label: "Curs", emoji: "📖" },
  seminar: { label: "Seminar", emoji: "✏️" },
  laborator: { label: "Laborator", emoji: "🔬" },
  examen: { label: "Examen", emoji: "📝" },
  fisa: { label: "Fișă", emoji: "📋" },
  altele: { label: "Altele", emoji: "📎" },
};

interface DocumentCardProps {
  id: string;
  title: string;
  professor: string;
  docType: string;
  downloadCount: number;
  createdAt: string;
  isLoggedIn: boolean;
}

export default function DocumentCard({
  id,
  title,
  professor,
  docType,
  downloadCount,
  createdAt,
  isLoggedIn,
}: DocumentCardProps) {
  const typeInfo = DOC_TYPE_LABELS[docType] ?? DOC_TYPE_LABELS.altele;

  const timeAgo = getTimeAgo(createdAt);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-red-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 4h5v5a1 1 0 001 1h5v10H6V4z" />
              <path d="M8 13h8v1H8zm0 3h5v1H8z" />
            </svg>
          </div>
          <div className="min-w-0">
            <Link
              href={`/document/${id}`}
              className="text-sm font-semibold text-deep-blue hover:text-accent-orange transition-colors line-clamp-1"
            >
              {title}
            </Link>
            <p className="text-xs text-medium-gray mt-0.5 truncate">
              {professor}
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1 bg-light-gray text-dark-gray text-xs font-medium px-2.5 py-1 rounded-full shrink-0">
          <span>{typeInfo.emoji}</span>
          <span>{typeInfo.label}</span>
        </span>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-3 text-xs text-medium-gray">
          <span className="flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {downloadCount}
          </span>
          <span>{timeAgo}</span>
        </div>

        <DownloadButton
          documentId={id}
          documentTitle={title}
          isLoggedIn={isLoggedIn}
        />
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "acum";
  if (diffMin < 60) return `acum ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `acum ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `acum ${diffD}z`;
  const diffM = Math.floor(diffD / 30);
  return `acum ${diffM} luni`;
}
