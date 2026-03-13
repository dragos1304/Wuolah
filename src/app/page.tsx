import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  // Authenticated users skip the landing page entirely
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <span className="text-deep-blue font-bold text-xl">
            Wuolah<span className="text-accent-orange">.</span>ro
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-dark-gray hover:text-deep-blue transition-colors"
            >
              Intră în cont
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-accent-orange text-white px-4 py-2 rounded-full hover:bg-orange-600 transition-colors"
            >
              Înregistrează-te gratuit
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-accent-orange text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-accent-orange rounded-full animate-pulse" />
            Platforma #1 pentru studenți din România
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-deep-blue leading-tight max-w-3xl mx-auto">
            Câștigă bani din{" "}
            <span className="text-accent-orange">notițele</span> tale de
            facultate
          </h1>

          <p className="mt-6 text-lg text-dark-gray max-w-xl mx-auto leading-relaxed">
            Încarcă materiale de studiu, colegii le descarcă gratuit, tu
            primești{" "}
            <span className="font-semibold text-deep-blue">0.05 RON</span>{" "}
            pentru fiecare descărcare unică.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-accent-orange text-white font-semibold px-8 py-4 rounded-full hover:bg-orange-600 transition-colors text-base shadow-md shadow-orange-200"
            >
              Începe să câștigi gratuit
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-deep-blue font-semibold px-8 py-4 rounded-full border border-gray-200 hover:bg-light-gray transition-colors text-base"
            >
              Am deja cont
            </Link>
          </div>

          <p className="mt-5 text-xs text-medium-gray">
            Fără card de credit · Descărcările sunt mereu gratuite
          </p>
        </section>

        {/* ── Stats strip ──────────────────────────────────────────────── */}
        <section className="bg-deep-blue py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 grid grid-cols-3 gap-6 text-center">
            {[
              { value: "0.05 RON", label: "Per descărcare unică" },
              { value: "50 RON", label: "Prag minim de retragere" },
              { value: "100%", label: "Descărcări gratuite" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl sm:text-3xl font-bold text-accent-orange">
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-white/60 mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-deep-blue">
              Cum funcționează?
            </h2>
            <p className="text-medium-gray mt-2">Trei pași simpli.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                emoji: "🎒",
                title: "Configurezi Rucsacul",
                desc: 'Alegi universitatea, facultatea și specializarea ta. Feedul tău devine imediat personalizat.',
              },
              {
                step: "2",
                emoji: "📤",
                title: "Încarci materiale",
                desc: "Publici notițe, cursuri sau examene rezolvate. Un scurt anunț le face accesibile gratuit.",
              },
              {
                step: "3",
                emoji: "💸",
                title: "Încasezi banii",
                desc: "Acumulezi 0.05 RON pentru fiecare descărcare unică. La 50 RON retragi prin IBAN sau Revolut.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                  {item.emoji}
                </div>
                <div className="inline-flex items-center justify-center w-6 h-6 bg-accent-orange text-white text-xs font-bold rounded-full mb-3">
                  {item.step}
                </div>
                <h3 className="text-base font-bold text-deep-blue mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-medium-gray leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Benefits ─────────────────────────────────────────────────── */}
        <section className="bg-light-gray py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-8">
            <h2 className="text-2xl font-bold text-deep-blue text-center mb-10">
              De ce Wuolah.ro?
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: "🆓",
                  title: "Descărcări complet gratuite",
                  desc: "Studenții nu plătesc niciodată. Sustenabilitatea vine din reclame.",
                },
                {
                  icon: "🔒",
                  title: "Materiale verificate",
                  desc: "Fiecare document este asociat cu o specializare și un profesor specific.",
                },
                {
                  icon: "📱",
                  title: "100% mobile-friendly",
                  desc: "Funcționează perfect pe telefon — acolo unde studiezi cel mai mult.",
                },
                {
                  icon: "🎯",
                  title: "Feed personalizat",
                  desc: "Vezi doar materiale relevante pentru cursurile tale, nu un ocean de documente.",
                },
                {
                  icon: "⚡",
                  title: "Plăți rapide",
                  desc: "Retrageri prin IBAN sau Revolut, procesate în 1–3 zile lucrătoare.",
                },
                {
                  icon: "🤝",
                  title: "Comunitate studențească",
                  desc: "Construim împreună cea mai bună bibliotecă academică din România.",
                },
              ].map((b) => (
                <div
                  key={b.title}
                  className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
                >
                  <span className="text-2xl">{b.icon}</span>
                  <h3 className="text-sm font-bold text-deep-blue mt-3 mb-1">
                    {b.title}
                  </h3>
                  <p className="text-xs text-medium-gray leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold text-deep-blue mb-4">
            Pregătit să transformi notițele în bani?
          </h2>
          <p className="text-medium-gray mb-8 max-w-md mx-auto">
            Alătură-te studenților care câștigă deja din materialele lor de
            studiu.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-accent-orange text-white font-bold px-10 py-4 rounded-full hover:bg-orange-600 transition-colors text-base shadow-lg shadow-orange-200"
          >
            Creează cont gratuit
          </Link>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-medium-gray">
          <span className="font-bold text-deep-blue">
            Wuolah<span className="text-accent-orange">.</span>ro
          </span>
          <span>© {new Date().getFullYear()} Wuolah Romania. Toate drepturile rezervate.</span>
        </div>
      </footer>
    </div>
  );
}
