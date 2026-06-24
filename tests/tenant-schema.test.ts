import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");

test("schema contains patient ownership and clinic tenancy", () => {
  assert.match(schema, /owner_user_id uuid references auth\.users/);
  assert.match(schema, /organization_id uuid references public\.organizations/);
  assert.match(schema, /organization_memberships/);
});

test("case policies enforce owner or active organization membership", () => {
  assert.match(schema, /cases_read_owner_or_org/);
  assert.match(schema, /owner_user_id = auth\.uid\(\) or public\.is_org_member\(organization_id\)/);
});

test("clinical storage access follows case ownership", () => {
  assert.match(schema, /case_files_authenticated_read/);
  assert.match(schema, /storage\.foldername\(name\)/);
  assert.match(schema, /c\.owner_user_id = auth\.uid\(\) or public\.is_org_member\(c\.organization_id\)/);
});

test("patient ownership is distinct from clinic organization tenancy", () => {
  assert.match(schema, /owner_user_id = auth\.uid\(\)/);
  assert.match(schema, /public\.is_org_member\(organization_id\)/);
});

test("clinic cases support organization-scoped assignment", () => {
  assert.match(schema, /assigned_to text/);
  assert.match(schema, /cases_update_owner_or_org/);
  assert.match(schema, /for update using \(owner_user_id = auth\.uid\(\) or public\.is_org_member\(organization_id\)\)/);
});
