import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WithdrawForm from "./WithdrawForm";
import type { WithdrawalStatus, WithdrawalMethod } from "@/types/database";

export const metadata = {
  title: "Portofel — Wuolah Romania",
};

const STATUS_CONFIG: Record<
  WithdrawalStatus,
  { label: string; classes: string }
> = {
  PENDING: {
    label: "În așteptare",
    classes: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  APPROVED: {
    label: "Aprobat",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  COMPLETED: {
    label: "Finalizat",
    classes: "bg-green-50 text-green-700 border-green-200",
  },
  REJECTED: {
    label: "Respins",
    classes: "bg-red-50 text-red-600 border-red-200",
  },
};

const METHOD_LABELS: Record<WithdrawalMethod, string> = {
  iban: "Transfer IBAN",
  revolut: "Revolut",
};

export default async function WalletPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ── Parallel data fetching ───────────────────────────────────────────────
  const [
    { data: wallet },
    { data: documents },
    { data: withdrawals },
  ] = await Promise.all([
    supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single(),

    // Aggregate download stats from user's own documents
    supabase
      .from("documents")
      .select("download_count")
      .eq("uploader_id", user.id)
      .eq("status", "ACTIVE"),

    supabase
      .from("withdrawal_requests")
      .select("id, amount, method, iban_or_revolut, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const currentBalance = wallet?.balance ?? 0;

  // Total credited downloads = sum of download_count on user's active documents
  const totalCreditedDownloads = (documents ?? []).reduce(
    (sum, doc) => sum + (doc.download_count ?? 0),
    0
  );

  // Lifetime earnings = current balance + all non-rejected withdrawal amounts
  const withdrawnAmount = (withdrawals ?? [])
    .filter((w) => w.status === "COMPLETED" || w.status === "APPROVED")
    .reduce((sum, w) => sum + w.amount, 0);
  const lifetimeEarnings = currentBalance + withdrawnAmount;

  const hasPendingWithdrawal = (withdrawals ?? []).some(
    (w) => w.status === "PENDING"
  );

  // Effective balance for the form — if there's a pending withdrawal,
  // the balance has already been deducted, so just pass the real balance.
  const effectiveBalance = currentBalance;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-deep-blue">Portofelul meu</h1>
        <p className="text-sm text-medium-gray mt-1">
          Câștigurile tale din materiale de studiu
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Current balance — accent card */}
        <div className="sm:col-span-1 bg-deep-blue rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
            <svg
              className="w-5 h-5 text-accent-orange"
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
          </div>
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wide">
              Sold curent
            </p>
            <p className="text-3xl font-bold text-white mt-1">
              {currentBalance.toFixed(2)}
              <span className="text-lg font-medium text-white/60 ml-1">
                RON
              </span>
            </p>
          </div>
        </div>

        {/* Credited downloads */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="w-10 h-10 bg-light-gray rounded-xl flex items-center justify-center mb-4">
            <svg
              className="w-5 h-5 text-deep-blue"
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
          </div>
          <div>
            <p className="text-medium-gray text-xs font-medium uppercase tracking-wide">
              Descărcări creditate
            </p>
            <p className="text-3xl font-bold text-deep-blue mt-1">
              {totalCreditedDownloads.toLocaleString("ro-RO")}
            </p>
          </div>
        </div>

        {/* Lifetime earnings */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
            <svg
              className="w-5 h-5 text-accent-orange"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <p className="text-medium-gray text-xs font-medium uppercase tracking-wide">
              Total câștigat
            </p>
            <p className="text-3xl font-bold text-deep-blue mt-1">
              {lifetimeEarnings.toFixed(2)}
              <span className="text-lg font-medium text-medium-gray ml-1">
                RON
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Withdrawal section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {hasPendingWithdrawal ? (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <svg
                className="w-4.5 h-4.5 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-deep-blue">
                Cerere de retragere în așteptare
              </p>
              <p className="text-xs text-medium-gray mt-0.5">
                Ai o retragere în curs de procesare. Poți solicita o nouă
                retragere după finalizarea acesteia.
              </p>
            </div>
          </div>
        ) : (
          <WithdrawForm balance={effectiveBalance} />
        )}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-deep-blue mb-4">
          Cum funcționează câștigurile?
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              emoji: "📄",
              title: "Încarci un document",
              desc: "Publici materiale de studiu pentru colegii tăi.",
            },
            {
              emoji: "💸",
              title: "0.05 RON per descărcare",
              desc: "Câștiguri pentru fiecare descărcare unică din 24h.",
            },
            {
              emoji: "🏦",
              title: "Retragere la 50 RON",
              desc: "Banii ajung în cont în 1–3 zile lucrătoare.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5">{item.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-deep-blue">
                  {item.title}
                </p>
                <p className="text-xs text-medium-gray mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Withdrawal history */}
      <div>
        <h2 className="text-lg font-bold text-deep-blue mb-4">
          Istoricul retragerilor
        </h2>

        {!withdrawals || withdrawals.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-10 text-center">
            <p className="text-sm font-medium text-dark-gray">
              Nicio retragere efectuată încă
            </p>
            <p className="text-xs text-medium-gray mt-1">
              Cererile tale de retragere vor apărea aici.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
            {withdrawals.map((w) => {
              const config = STATUS_CONFIG[w.status as WithdrawalStatus];
              const date = new Date(w.created_at).toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const maskedDetail = maskPaymentDetail(
                w.iban_or_revolut,
                w.method as WithdrawalMethod
              );

              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-5 py-4 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-light-gray rounded-lg flex items-center justify-center shrink-0 text-sm">
                      {w.method === "revolut" ? "💜" : "🏦"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-deep-blue">
                        {w.amount.toFixed(2)} RON
                      </p>
                      <p className="text-xs text-medium-gray truncate">
                        {METHOD_LABELS[w.method as WithdrawalMethod]} ·{" "}
                        {maskedDetail}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${config.classes}`}
                    >
                      {config.label}
                    </span>
                    <span className="text-xs text-medium-gray">{date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Partially mask IBAN or Revolut tag for privacy */
function maskPaymentDetail(detail: string, method: WithdrawalMethod): string {
  if (method === "iban") {
    const clean = detail.replace(/\s/g, "");
    if (clean.length <= 8) return clean;
    return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
  }
  // Revolut
  const tag = detail.startsWith("@") ? detail : `@${detail}`;
  if (tag.length <= 5) return tag;
  return `${tag.slice(0, 3)}${"•".repeat(tag.length - 5)}${tag.slice(-2)}`;
}
