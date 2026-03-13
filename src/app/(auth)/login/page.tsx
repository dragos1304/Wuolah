"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Reads ?error= from the auth/callback redirect; must be inside Suspense
function CallbackErrorReader({
  onError,
}: {
  onError: (msg: string) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const msg = searchParams.get("error");
    if (msg) onError(msg);
  }, [searchParams, onError]);
  return null;
}

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!email.trim()) {
      setError("Adresa de email este obligatorie.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Adresa de email nu este validă.");
      return;
    }
    if (!password) {
      setError("Parola este obligatorie.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setLoading(false);
      // Map Supabase error codes to user-friendly Romanian messages
      if (
        authError.message.includes("Invalid login credentials") ||
        authError.message.includes("invalid_credentials")
      ) {
        setError("Email sau parolă incorectă. Încearcă din nou.");
      } else if (authError.message.includes("Email not confirmed")) {
        setError(
          "Emailul tău nu a fost confirmat. Verifică inbox-ul și urmează linkul de activare."
        );
      } else if (authError.message.includes("Too many requests")) {
        setError("Prea multe încercări. Așteaptă câteva minute și încearcă din nou.");
      } else {
        setError("A apărut o eroare. Încearcă din nou.");
      }
      return;
    }

    // Session established — middleware will handle backpack/dashboard routing
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-light-gray flex flex-col items-center justify-center px-4 py-12">
      <CallbackErrorReader onError={setError} />

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
              Bine ai revenit!
            </h1>
            <p className="text-sm text-medium-gray mt-1">
              Intră în contul tău pentru a continua.
            </p>
          </div>

          <form onSubmit={handleLogin} noValidate className="space-y-4">
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
                  if (error) setError(null);
                }}
                placeholder="student@universitate.ro"
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent disabled:opacity-60 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-deep-blue"
                >
                  Parolă
                </label>
                <button
                  type="button"
                  tabIndex={-1}
                  className="text-xs text-accent-orange hover:text-orange-600 font-medium transition-colors"
                  onClick={() => {
                    // TODO: implement forgot password flow
                    alert("Funcționalitate în curând. Contactează suportul.");
                  }}
                >
                  Ai uitat parola?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent disabled:opacity-60 transition-colors"
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
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent-orange text-white font-semibold py-3.5 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Se verifică...
                </>
              ) : (
                "Intră în cont"
              )}
            </button>
          </form>
        </div>

        {/* Link to register */}
        <p className="text-center text-sm text-medium-gray mt-5">
          Nu ai cont?{" "}
          <Link
            href="/register"
            className="font-semibold text-accent-orange hover:text-orange-600 transition-colors"
          >
            Înregistrează-te gratuit
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

