import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SIGNED_URL_EXPIRY_SECONDS = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: "Trebuie să fii autentificat pentru a descărca." },
        { status: 401 }
      );
    }

    // 2. Parse and validate body
    let body: { document_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body invalid." },
        { status: 400 }
      );
    }

    const documentId = body.document_id;
    if (!documentId || typeof documentId !== "string") {
      return NextResponse.json(
        { error: "Parametrul document_id este obligatoriu." },
        { status: 400 }
      );
    }

    // 3. Fetch document to get the file_url (needed for signed URL)
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, file_url, status, uploader_id")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Documentul nu a fost găsit." },
        { status: 404 }
      );
    }

    if (doc.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Documentul nu este disponibil pentru descărcare." },
        { status: 403 }
      );
    }

    // 4. Execute the atomic credit_download function via service role
    //    This runs as SECURITY DEFINER — handles 24h uniqueness, self-download
    //    check, wallet credit, and download_count increment atomically.
    const serviceClient = createServiceClient();

    const { data: creditResult, error: rpcError } = await serviceClient.rpc(
      "credit_download",
      {
        p_user_id: user.id,
        p_document_id: documentId,
      }
    );

    if (rpcError) {
      console.error("credit_download RPC error:", rpcError);
      return NextResponse.json(
        { error: "Eroare la procesarea descărcării." },
        { status: 500 }
      );
    }

    if (creditResult && !creditResult.success) {
      return NextResponse.json(
        { error: creditResult.reason ?? "Descărcare eșuată." },
        { status: 400 }
      );
    }

    // 5. Generate a short-lived signed URL for the file
    const { data: signedUrlData, error: signedUrlError } =
      await serviceClient.storage
        .from("documents")
        .createSignedUrl(doc.file_url, SIGNED_URL_EXPIRY_SECONDS);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Signed URL error:", signedUrlError);
      return NextResponse.json(
        { error: "Nu s-a putut genera linkul de descărcare." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      credited: creditResult?.credited ?? false,
      is_duplicate: creditResult?.is_duplicate ?? false,
      is_own_doc: creditResult?.is_own_doc ?? false,
    });
  } catch (err) {
    console.error("Download API unexpected error:", err);
    return NextResponse.json(
      { error: "Eroare internă de server." },
      { status: 500 }
    );
  }
}
