import { createClient } from "@supabase/supabase-js";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function ndjsonStringify(obj) {
  return `${JSON.stringify(obj)}\n`;
}

async function exportReviewed() {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = "case-files";

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("created_at, corrected, reviewed_at")
    .eq("status", "reviewed")
    .order("reviewed_at", { ascending: true });

  if (error) {
    throw error;
  }

  const lines = (reviews ?? []).map((r) =>
    ndjsonStringify({
      created_at: r.created_at,
      reviewed_at: r.reviewed_at,
      corrected: r.corrected,
    }),
  );

  const payload = lines.join("");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `exports/reviews-${timestamp}.ndjson`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, Buffer.from(payload), {
    upsert: true,
    contentType: "application/x-ndjson",
  });
  if (uploadError) {
    await supabase.from("export_jobs").insert({ path, record_count: (reviews ?? []).length, status: "failure", error: uploadError.message });
    throw uploadError;
  }

  const signedRes = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  const signedUrl = signedRes.data?.signedUrl ?? null;

  await supabase.from("export_jobs").insert({ path, public_url: null, record_count: (reviews ?? []).length, status: "success" });

  console.log(`Exported ${reviews?.length ?? 0} reviewed records to ${path}`);
  console.log(`Signed URL (expires in 1 hour): ${signedUrl}`);
}

exportReviewed().catch((error) => {
  console.error("Export failed:", error.message || error);
  process.exit(1);
});
