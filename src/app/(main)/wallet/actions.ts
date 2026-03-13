"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { WithdrawalMethod } from "@/types/database";

const MIN_WITHDRAWAL = 50;

export interface WithdrawInput {
  amount: number;
  method: WithdrawalMethod;
  iban_or_revolut: string;
}

export type WithdrawResult =
  | { success: true; withdrawalId: string }
  | { error: string };

export async function requestWithdrawal(
  input: WithdrawInput
): Promise<WithdrawResult> {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) redirect("/login");

  // ── 2. Input validation ──────────────────────────────────────────────────
  const { amount, method, iban_or_revolut } = input;
  const detail = iban_or_revolut.trim();

  if (!method || (method !== "iban" && method !== "revolut")) {
    return { error: "Metodă de plată invalidă." };
  }

  if (!detail) {
    return { error: "Introduceți detaliile de plată." };
  }

  if (method === "iban") {
    // Romanian IBAN: RO + 22 alphanumeric chars = 24 total
    const ibanClean = detail.replace(/\s/g, "").toUpperCase();
    if (!/^RO\d{2}[A-Z0-9]{20}$/.test(ibanClean)) {
      return {
        error:
          "IBAN invalid. Formatul corect pentru România este RO + 22 caractere (ex: RO49AAAA1B31007593840000).",
      };
    }
  }

  if (method === "revolut") {
    // Revolut tags: optional leading @, 5–16 alphanumeric/underscore chars
    const tag = detail.startsWith("@") ? detail.slice(1) : detail;
    if (!/^[a-zA-Z0-9_]{5,16}$/.test(tag)) {
      return {
        error:
          "Tag Revolut invalid. Trebuie să aibă 5–16 caractere alfanumerice.",
      };
    }
  }

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
    return { error: `Suma minimă de retragere este ${MIN_WITHDRAWAL} RON.` };
  }

  // Round to 2 decimal places to avoid floating-point surprises
  const requestedAmount = Math.round(amount * 100) / 100;

  // ── 3. Fetch live balance with service role (cannot be spoofed) ──────────
  const service = createServiceClient();

  const { data: wallet, error: walletError } = await service
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  if (walletError || !wallet) {
    return { error: "Nu s-a putut verifica soldul. Încearcă din nou." };
  }

  const currentBalance = Math.round(wallet.balance * 100) / 100;

  if (requestedAmount > currentBalance) {
    return {
      error: `Sold insuficient. Soldul tău curent este ${currentBalance.toFixed(2)} RON.`,
    };
  }

  if (currentBalance < MIN_WITHDRAWAL) {
    return {
      error: `Soldul minim pentru retragere este ${MIN_WITHDRAWAL} RON.`,
    };
  }

  // ── 4. Guard: no duplicate PENDING withdrawal ────────────────────────────
  const { count: pendingCount } = await service
    .from("withdrawal_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "PENDING");

  if ((pendingCount ?? 0) > 0) {
    return {
      error:
        "Ai deja o cerere de retragere în așteptare. Așteaptă procesarea ei înainte de a trimite alta.",
    };
  }

  // ── 5. Atomic deduction: only succeeds if balance is still sufficient ────
  //    The .gte("balance", requestedAmount) filter acts as an atomic guard —
  //    if the balance dropped between our read and this write, 0 rows update.
  const newBalance = Math.round((currentBalance - requestedAmount) * 100) / 100;

  const { data: updatedWallet, error: deductError } = await service
    .from("wallets")
    .update({ balance: newBalance })
    .eq("user_id", user.id)
    .gte("balance", requestedAmount) // atomic guard
    .select("balance")
    .single();

  if (deductError || !updatedWallet) {
    // Either a DB error or the balance changed — reject safely
    return {
      error:
        "Soldul s-a modificat în timpul procesării. Reîncarcă pagina și încearcă din nou.",
    };
  }

  // ── 6. Insert withdrawal request ─────────────────────────────────────────
  const { data: withdrawal, error: insertError } = await service
    .from("withdrawal_requests")
    .insert({
      user_id: user.id,
      amount: requestedAmount,
      method,
      iban_or_revolut: detail,
      status: "PENDING",
    })
    .select("id")
    .single();

  if (insertError || !withdrawal) {
    // Rollback the deduction — add the amount back
    await service
      .from("wallets")
      .update({ balance: currentBalance })
      .eq("user_id", user.id);

    return {
      error: "Nu s-a putut înregistra cererea. Fondurile nu au fost deduse.",
    };
  }

  return { success: true, withdrawalId: withdrawal.id };
}
