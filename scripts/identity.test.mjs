import assert from "node:assert/strict";
import test from "node:test";
import { CAMPUS_EMAIL_DOMAIN, isCampusEmail, normalizeCampusEmail } from "../lib/identity.ts";

test("campus emails use the requested IKAMASU domain", () => {
  assert.equal(CAMPUS_EMAIL_DOMAIN, "ikamasu.ac.id");
  assert.equal(isCampusEmail("nama@ikamasu.ac.id"), true);
  assert.equal(isCampusEmail("nama.mahasiswa+kelas@ikamasu.ac.id"), true);
});

test("capitalization and accidental surrounding whitespace are normalized", () => {
  assert.equal(normalizeCampusEmail("  Nama@IKAMASU.AC.ID  "), "nama@ikamasu.ac.id");
  assert.equal(isCampusEmail("  Nama@IKAMASU.AC.ID  "), true);
});

test("old, personal, lookalike, subdomain and suffix domains are rejected", () => {
  for (const email of [
    "nama@polban.ac.id",
    "nama@gmail.com",
    "nama@ikamasuXacXid",
    "nama@students.ikamasu.ac.id",
    "nama@ikamasu.ac.id.example.com",
    "nama@ikamasu.ac.id@evil.example",
  ]) assert.equal(isCampusEmail(email), false, email);
});

test("missing local part, multiple separators and internal whitespace are rejected", () => {
  for (const email of ["", "@ikamasu.ac.id", "nama", "nama@@ikamasu.ac.id", "nama lain@ikamasu.ac.id", "nama\nbaru@ikamasu.ac.id"])
    assert.equal(isCampusEmail(email), false, email);
});
