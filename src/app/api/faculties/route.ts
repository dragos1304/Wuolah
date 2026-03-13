import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const universityId = searchParams.get("university_id");

  if (!universityId) {
    return NextResponse.json(
      { error: "Parametrul university_id este obligatoriu." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faculties")
    .select("id, name")
    .eq("university_id", universityId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
