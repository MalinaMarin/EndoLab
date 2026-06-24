import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import os from "os";
import path from "path";

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

function deidentifyCase(c) {
  const out = { ...c };
  out.title = "REDACTED";
  out.age = null;
  out.country = null;
  out.symptoms = [];
  out.imaging = [];
  out.uncertainty_flags = [];
  out.missing_info = [];
  out.surgeries = (out.surgeries ?? []).map((s) => ({ type: s.type ?? "", year: s.year ?? null }));
  out.timeline = [];
  out.summary = "REDACTED";
  return out;
}

async function processOnce() {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = "case-files";

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // pick a pending job
  const { data: jobs, error: jobErr } = await supabase.from("export_jobs").select("id, created_at, deidentified").eq("status", "pending").order("created_at", { ascending: true }).limit(1);
  if (jobErr) throw jobErr;
  const job = jobs?.[0];
  if (!job) return false; // nothing to do

  const jobId = job.id;
  console.log(`Processing export job ${jobId}`);

  // mark processing
  await supabase.from("export_jobs").update({ status: "processing" }).eq("id", jobId);

    try {
      // paginate cases in batches and stream to a temp file to avoid high memory usage
      const batchSize = 1000;
      let offset = 0;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `cases-${job.deidentified ? "deidentified-" : ""}${timestamp}.ndjson`;
      const tmpPath = path.join(os.tmpdir(), `endolab-${filename}`);
      const writeStream = fs.createWriteStream(tmpPath, { flags: "w" });

      let totalCount = 0;
      while (true) {
        const from = offset;
        const to = offset + batchSize - 1;
        const { data: batch, error } = await supabase.from("cases").select("*").range(from, to);
        if (error) {
          writeStream.close();
          await supabase.from("export_jobs").update({ status: "failure", error: error.message }).eq("id", jobId);
          return true;
        }
        if (!batch || batch.length === 0) break;

        for (const c of batch) {
          const row = job.deidentified ? deidentifyCase(c) : c;
          writeStream.write(ndjsonStringify(row));
        }

        totalCount += batch.length;
        offset += batch.length;
        if (batch.length < batchSize) break;
      }

      // finalize file
      await new Promise((res) => writeStream.end(res));

      const remotePath = `exports/${filename}`;
      const fileStream = fs.createReadStream(tmpPath);
      const uploadRes = await supabase.storage.from(bucket).upload(remotePath, fileStream, { upsert: true, contentType: "application/x-ndjson" });
      if (uploadRes.error) {
        await supabase.from("export_jobs").update({ status: "failure", error: uploadRes.error.message }).eq("id", jobId);
        // cleanup
        try { fs.unlinkSync(tmpPath); } catch {}
        return true;
      }

      const signedRes = await supabase.storage.from(bucket).createSignedUrl(remotePath, 60 * 60);
      const signedUrl = signedRes.data?.signedUrl ?? null;

      await supabase.from("export_jobs").update({ path: remotePath, public_url: null, record_count: totalCount, status: "success" }).eq("id", jobId);

      // cleanup
      try { fs.unlinkSync(tmpPath); } catch {}

      console.log(`Export job ${jobId} succeeded, signed url: ${signedUrl}`);
      return true;
    } catch (err) {
      await supabase.from("export_jobs").update({ status: "failure", error: err.message ?? String(err) }).eq("id", jobId);
      return true;
    }
}

async function loop() {
  while (true) {
    try {
      const didWork = await processOnce();
      if (!didWork) {
        // sleep 5s
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch (err) {
      console.error("Worker error:", err.message || err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

if (require.main === module) {
  loop();
}

export { processOnce };
