import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
    : { data: null };

  const displayName =
    profile?.full_name ?? user?.email?.split("@")[0] ?? "Student";

  return (
    <div className="min-h-screen bg-light-gray">
      <nav className="bg-deep-blue shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-white font-bold text-xl">
              Wuolah<span className="text-accent-orange">.</span>ro
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              Acasă
            </Link>
            <Link
              href="/upload"
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              Încarcă
            </Link>
            <Link
              href="/wallet"
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              Portofel
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/settings">
              <div className="w-9 h-9 rounded-full bg-accent-orange flex items-center justify-center text-white font-bold text-sm uppercase">
                {displayName.charAt(0)}
              </div>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8">{children}</main>
    </div>
  );
}
