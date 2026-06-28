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

test("patient cases support archived clinical journeys", () => {
  assert.match(schema, /status text not null default 'submitted'/);
  assert.match(schema, /cases_owner_user_id_idx/);
});

test("case messages are scoped through case access policies", () => {
  assert.match(schema, /create table if not exists public\.case_messages/);
  assert.match(schema, /case_messages_access_by_case/);
  assert.match(schema, /where c\.id = case_messages\.case_id/);
  assert.match(schema, /c\.owner_user_id = auth\.uid\(\) or public\.is_org_member\(c\.organization_id\)/);
});

test("case documents track OCR status inside case access policies", () => {
  assert.match(schema, /create table if not exists public\.case_documents/);
  assert.match(schema, /ocr_status text not null default 'not_required'/);
  assert.match(schema, /case_documents_access_by_case/);
  assert.match(schema, /where c\.id = case_documents\.case_id/);
  assert.match(schema, /public\.case_documents/);
});
