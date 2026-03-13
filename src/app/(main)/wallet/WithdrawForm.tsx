"use client";

import { useState, useTransition, useEffect } from "react";
import { requestWithdrawal } from "./actions";
import type { WithdrawalMethod } from "@/types/database";

const MIN_WITHDRAWAL = 50;

interface WithdrawFormProps {
  balance: number;
}

type FormState = "closed" | "open" | "success" | "error";

const METHOD_OPTIONS: { value: WithdrawalMethod; label: string; icon: string; hint: string }[] = [
  {
    value: "iban",
    label: "Transfer bancar (IBAN)",
    icon: "🏦",
    hint: "ex: RO49AAAA1B31007593840000",
  },
  {
    value: "revolut",
    label: "Revolut",
    icon: "💜",
    hint: "ex: @username (5–16 caractere)",
  },
];

export default function WithdrawForm({ balance }: WithdrawFormProps) {
  const isEligible = balance >= MIN_WITHDRAWAL;

  const [formState, setFormState] = useState<FormState>("closed");
  const [method, setMethod] = useState<WithdrawalMethod>("iban");
  const [paymentDetail, setPaymentDetail] = useState("");
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Sync amount field if balance prop changes
  useEffect(() => {
    if (formState === "open") setAmount(balance.toFixed(2));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);

  const resetForm = () => {
    setMethod("iban");
    setPaymentDetail("");
    setAmount(balance.toFixed(2));
    setFieldErrors({});
    setServerError(null);
  };

  const openForm = () => {
    resetForm();
    setFormState("open");
  };

  const closeForm = () => {
    setFormState("closed");
    resetForm();
  };

  // ── Client-side validation (mirrors server) ────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount < MIN_WITHDRAWAL) {
      errors.amount = `Suma minimă este ${MIN_WITHDRAWAL} RON.`;
    } else if (numAmount > balance) {
      errors.amount = `Suma nu poate depăși soldul de ${balance.toFixed(2)} RON.`;
    }

    if (!paymentDetail.trim()) {
      errors.paymentDetail =
        method === "iban" ? "Introdu IBAN-ul." : "Introdu tag-ul Revolut.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setServerError(null);

    startTransition(async () => {
      const result = await requestWithdrawal({
        amount: parseFloat(amount),
        method,
        iban_or_revolut: paymentDetail.trim(),
      });

      if ("error" in result) {
        setServerError(result.error);
        return;
      }

      setSuccessId(result.withdrawalId);
      setFormState("success");
    });
  };

  const progressPercent = Math.min((balance / MIN_WITHDRAWAL) * 100, 100);

  // ── Locked state (balance < 50 RON) ───────────────────────────────────
  const renderLockedButton = () => (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs text-medium-gray mb-1.5">
          <span>Progres spre retragere</span>
          <span>
            {balance.toFixed(2)} / {MIN_WITHDRAWAL} RON
          </span>
        </div>
        <div className="h-2 bg-light-gray rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-orange rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        disabled
        className="w-full flex items-center justify-center gap-2 bg-gray-100 text-medium-gray font-semibold py-3.5 rounded-full cursor-not-allowed text-sm"
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
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Retrage bani — minim {MIN_WITHDRAWAL} RON
      </button>
      <p className="text-xs text-medium-gray text-center">
        Îți mai lipsesc{" "}
        <span className="font-semibold text-dark-gray">
          {Math.max(0, MIN_WITHDRAWAL - balance).toFixed(2)} RON
        </span>{" "}
        pentru a putea retrage.
      </p>
    </div>
  );

  // ── Unlocked CTA ───────────────────────────────────────────────────────
  const renderUnlockedButton = () => (
    <button
      type="button"
      onClick={openForm}
      className="w-full flex items-center justify-center gap-2 bg-accent-orange text-white font-semibold py-3.5 rounded-full hover:bg-orange-600 transition-colors text-sm"
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
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Retrage bani
    </button>
  );

  // ── Withdrawal Form ────────────────────────────────────────────────────
  const renderForm = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-deep-blue">Cerere de retragere</h3>
        <button
          type="button"
          onClick={closeForm}
          disabled={isPending}
          className="w-7 h-7 rounded-full bg-light-gray hover:bg-gray-200 flex items-center justify-center transition-colors"
          aria-label="Închide"
        >
          <svg className="w-3.5 h-3.5 text-dark-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Method selector */}
      <div>
        <label className="block text-sm font-semibold text-deep-blue mb-2">
          Metodă de plată <span className="text-accent-orange">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {METHOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setMethod(opt.value);
                setPaymentDetail("");
                setFieldErrors((p) => ({ ...p, paymentDetail: "" }));
              }}
              disabled={isPending}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 text-left
                ${method === opt.value
                  ? "border-accent-orange bg-orange-50 text-accent-orange"
                  : "border-gray-200 bg-white text-dark-gray hover:border-accent-orange/40"
                } disabled:opacity-60`}
            >
              <span className="text-xl leading-none">{opt.icon}</span>
              <span className="leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment detail input */}
      <div>
        <label className="block text-sm font-semibold text-deep-blue mb-1.5">
          {method === "iban" ? "IBAN" : "Tag Revolut"}{" "}
          <span className="text-accent-orange">*</span>
        </label>
        <input
          type="text"
          value={paymentDetail}
          onChange={(e) => {
            setPaymentDetail(e.target.value);
            if (fieldErrors.paymentDetail)
              setFieldErrors((p) => ({ ...p, paymentDetail: "" }));
          }}
          placeholder={METHOD_OPTIONS.find((o) => o.value === method)?.hint}
          maxLength={method === "iban" ? 34 : 17}
          disabled={isPending}
          className={`w-full px-4 py-3 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-colors disabled:opacity-60
            ${fieldErrors.paymentDetail ? "border-red-300 bg-red-50" : "border-gray-200"}`}
        />
        {fieldErrors.paymentDetail && (
          <p className="text-xs text-red-500 mt-1">{fieldErrors.paymentDetail}</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-semibold text-deep-blue mb-1.5">
          Sumă (RON) <span className="text-accent-orange">*</span>
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (fieldErrors.amount)
                setFieldErrors((p) => ({ ...p, amount: "" }));
            }}
            min={MIN_WITHDRAWAL}
            max={balance}
            step="0.01"
            disabled={isPending}
            className={`w-full pl-4 pr-16 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-colors disabled:opacity-60
              ${fieldErrors.amount ? "border-red-300 bg-red-50" : "border-gray-200"}`}
          />
          <button
            type="button"
            onClick={() => {
              setAmount(balance.toFixed(2));
              setFieldErrors((p) => ({ ...p, amount: "" }));
            }}
            disabled={isPending}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-accent-orange hover:text-orange-600 transition-colors disabled:opacity-50"
          >
            MAX
          </button>
        </div>
        {fieldErrors.amount ? (
          <p className="text-xs text-red-500 mt-1">{fieldErrors.amount}</p>
        ) : (
          <p className="text-xs text-medium-gray mt-1">
            Minim {MIN_WITHDRAWAL} RON · Sold disponibil: {balance.toFixed(2)} RON
          </p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
          <p className="text-sm text-red-600">{serverError}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={closeForm}
          disabled={isPending}
          className="flex-1 py-3 rounded-full border border-gray-200 text-sm font-medium text-dark-gray hover:bg-light-gray transition-colors disabled:opacity-50"
        >
          Anulează
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 bg-accent-orange text-white font-semibold py-3 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-60 text-sm"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Se procesează...
            </>
          ) : (
            "Confirmă retragerea"
          )}
        </button>
      </div>

      <p className="text-xs text-medium-gray text-center">
        Procesare în 1–3 zile lucrătoare. Suma va fi dedusă din sold imediat.
      </p>
    </div>
  );

  // ── Success state ──────────────────────────────────────────────────────
  const renderSuccess = () => (
    <div className="text-center py-4 space-y-3">
      <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h3 className="font-bold text-deep-blue">Cerere trimisă cu succes!</h3>
        <p className="text-sm text-medium-gray mt-1">
          Îți vei primi banii în 1–3 zile lucrătoare.
        </p>
        {successId && (
          <p className="text-xs text-medium-gray mt-1">
            Referință: <span className="font-mono text-dark-gray">{successId.slice(0, 8)}</span>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setFormState("closed");
          resetForm();
          // Refresh is handled by the parent via router — page will revalidate
          window.location.reload();
        }}
        className="text-sm font-medium text-deep-blue bg-light-gray hover:bg-gray-200 px-6 py-2.5 rounded-full transition-colors"
      >
        Închide
      </button>
    </div>
  );

  return (
    <div>
      {formState === "closed" && (isEligible ? renderUnlockedButton() : renderLockedButton())}
      {formState === "open" && renderForm()}
      {formState === "success" && renderSuccess()}
    </div>
  );
}
