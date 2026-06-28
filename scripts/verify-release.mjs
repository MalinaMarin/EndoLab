import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireFile(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) failures.push(`Missing ${relativePath}`);
}

[
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
  "app/api/health/route.ts",
  "app/api/stripe/webhook/route.ts",
  "app/login/page.tsx",
  "app/signup/page.tsx",
  "app/patient/dashboard/page.tsx",
  "app/clinic/team/page.tsx",
  "components/clinical/case-intelligence-panel.tsx",
  "lib/intelligence.ts",
  "supabase/schema.sql",
  ".env.example",
].forEach(requireFile);

const schema = read("supabase/schema.sql");
if (!schema.includes("values ('case-files', 'case-files', false)")) failures.push("case-files storage bucket is not private");
if (!schema.includes("enable row level security")) failures.push("database schema does not enable row-level security");
if (!schema.includes("payment_status")) failures.push("database schema is missing payment state");
if (!schema.includes("owner_user_id")) failures.push("database schema is missing patient case ownership");
if (!schema.includes("organization_memberships")) failures.push("database schema is missing clinic memberships");
if (!schema.includes("cases_read_owner_or_org")) failures.push("database schema is missing tenant case policies");
if (!schema.includes("to service_role")) failures.push("database schema is missing explicit service-role grants");

const sourceFiles = [];
for (const directory of ["app", "components", "lib", "scripts"]) {
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (/\.(ts|tsx|mjs)$/.test(entry.name)) sourceFiles.push(fullPath);
    }
  };
  walk(path.join(root, directory));
}

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  if (relative === "scripts/verify-release.mjs") continue;
  if (/\b(TODO|FIXME|HACK|XXX)\b/.test(content)) failures.push(`${relative} contains unfinished markers`);
  if (content.includes("example.com")) failures.push(`${relative} contains a placeholder external URL`);
  if (content.includes(".getPublicUrl(")) failures.push(`${relative} creates a public storage URL`);
}

const envExample = read(".env.example");
for (const variable of ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "STRIPE_WEBHOOK_SECRET", "ADMIN_REVIEWER_SECRET"]) {
  if (!envExample.includes(`${variable}=`)) failures.push(`.env.example is missing ${variable}`);
}

const intelligence = read("lib/intelligence.ts");
if (!intelligence.includes("Do not diagnose")) failures.push("intelligence module is missing diagnostic-use prohibition");
if (!intelligence.includes("humanReviewRequired")) failures.push("intelligence module is missing human-review gate");

if (!process.env.STRIPE_SECRET_KEY) warnings.push("Stripe is not configured in this shell");

if (warnings.length) {
  console.log("Release warnings:");
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (failures.length) {
  console.error("Release verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Release verification passed.");
