import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const facultyId = searchParams.get("faculty_id");

  if (!facultyId) {
    return NextResponse.json(
      { error: "Parametrul faculty_id este obligatoriu." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specializations")
    .select("id, name")
    .eq("faculty_id", facultyId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
