"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = "Numele trebuie să aibă cel puțin 2 caractere.";
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Adresa de email nu este validă.";
    }
    if (!password || password.length < 8) {
      errors.password = "Parola trebuie să aibă cel puțin 8 caractere.";
    } else if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password =
        "Parola trebuie să conțină cel puțin o literă mare și o cifră.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Parolele nu se potrivesc.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        // Redirect to auth callback after email confirmation
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setLoading(false);
      if (authError.message.includes("already registered") || authError.message.includes("User already registered")) {
        setError(
          "Există deja un cont cu această adresă de email. Încearcă să te autentifici."
        );
      } else if (authError.message.includes("Password should be")) {
        setError("Parola nu respectă cerințele minime de securitate.");
      } else {
        setError("A apărut o eroare la înregistrare. Încearcă din nou.");
      }
      return;
    }

    // If session is immediately available (email confirmation disabled),
    // redirect straight to the backpack. Otherwise show the verify screen.
    if (data.session) {
      router.push("/backpack");
      router.refresh();
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  // ── Email confirmation pending screen ─────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-light-gray flex flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8">
          <span className="text-2xl font-bold text-deep-blue">
            Wuolah<span className="text-accent-orange">.</span>ro
          </span>
        </Link>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">
            ✉️
          </div>
          <h2 className="text-xl font-bold text-deep-blue mb-2">
            Verifică-ți emailul!
          </h2>
          <p className="text-sm text-medium-gray leading-relaxed">
            Am trimis un link de activare la{" "}
            <span className="font-semibold text-dark-gray">{email}</span>.
            <br />
            Deschide emailul și apasă pe link pentru a activa contul.
          </p>
          <p className="text-xs text-medium-gray mt-4">
            Nu ai primit emailul? Verifică folderul de spam sau{" "}
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="text-accent-orange font-semibold hover:underline"
            >
              încearcă din nou
            </button>
            .
          </p>
        </div>

        <p className="text-center text-sm text-medium-gray mt-5">
          Ai deja cont?{" "}
          <Link
            href="/login"
            className="font-semibold text-accent-orange hover:text-orange-600 transition-colors"
          >
            Conectează-te
          </Link>
        </p>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-light-gray flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link href="/" className="mb-8">
        <span className="text-2xl font-bold text-deep-blue">
          Wuolah<span className="text-accent-orange">.</span>ro
        </span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-deep-blue">
              Creează cont gratuit
            </h1>
            <p className="text-sm text-medium-gray mt-1">
              Începe să câștigi din materialele tale de studiu.
            </p>
          </div>

          <form onSubmit={handleRegister} noValidate className="space-y-4">
            {/* Full name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-semibold text-deep-blue mb-1.5"
              >
                Nume complet
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName)
                    setFieldErrors((p) => ({ ...p, fullName: "" }));
                }}
                placeholder="Ionescu Alexandru"
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent disabled:opacity-60 transition-colors
                  ${fieldErrors.fullName ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {fieldErrors.fullName && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-deep-blue mb-1.5"
              >
                Adresă de email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email)
                    setFieldErrors((p) => ({ ...p, email: "" }));
                }}
                placeholder="student@universitate.ro"
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent disabled:opacity-60 transition-colors
                  ${fieldErrors.email ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-deep-blue mb-1.5"
              >
                Parolă
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((p) => ({ ...p, password: "" }));
                  }}
                  placeholder="Minim 8 caractere"
                  disabled={loading}
                  className={`w-full px-4 py-3 pr-11 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent disabled:opacity-60 transition-colors
                    ${fieldErrors.password ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-medium-gray hover:text-dark-gray transition-colors"
                  aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                >
                  {showPassword ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.password}
                </p>
              )}

              {/* Password strength hint */}
              {password && !fieldErrors.password && (
                <PasswordStrength password={password} />
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-deep-blue mb-1.5"
              >
                Confirmă parola
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword)
                    setFieldErrors((p) => ({ ...p, confirmPassword: "" }));
                }}
                placeholder="Repetă parola"
                disabled={loading}
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent disabled:opacity-60 transition-colors
                  ${fieldErrors.confirmPassword ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Server error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Terms note */}
            <p className="text-xs text-medium-gray text-center pt-1">
              Prin înregistrare ești de acord cu{" "}
              <span className="text-deep-blue font-medium">
                Termenii și Condițiile
              </span>{" "}
              platformei.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent-orange text-white font-semibold py-3.5 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Se creează contul...
                </>
              ) : (
                "Creează cont"
              )}
            </button>
          </form>
        </div>

        {/* Link to login */}
        <p className="text-center text-sm text-medium-gray mt-5">
          Ai deja cont?{" "}
          <Link
            href="/login"
            className="font-semibold text-accent-orange hover:text-orange-600 transition-colors"
          >
            Conectează-te
          </Link>
        </p>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ caractere", ok: password.length >= 8 },
    { label: "Literă mare", ok: /[A-Z]/.test(password) },
    { label: "Cifră", ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const strengthLabel =
    score === 0 ? "" : score === 1 ? "Slabă" : score === 2 ? "Medie" : "Bună";
  const strengthColor =
    score === 1
      ? "bg-red-400"
      : score === 2
      ? "bg-yellow-400"
      : "bg-green-400";

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? strengthColor : "bg-gray-100"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map((c) => (
            <span
              key={c.label}
              className={`text-[10px] font-medium ${
                c.ok ? "text-green-600" : "text-medium-gray"
              }`}
            >
              {c.ok ? "✓" : "·"} {c.label}
            </span>
          ))}
        </div>
        {strengthLabel && (
          <span
            className={`text-[10px] font-semibold ${
              score === 3
                ? "text-green-600"
                : score === 2
                ? "text-yellow-600"
                : "text-red-500"
            }`}
          >
            {strengthLabel}
          </span>
        )}
      </div>
    </div>
  );
}
