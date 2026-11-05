import assert from "node:assert/strict";
import test from "node:test";
import {
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  CAMPUS_EMAIL_DOMAIN,
  avatarColorFor,
  isCampusEmail,
  isValidPin,
  normalizeCampusEmail,
  normalizeUsername,
  usernameError,
} from "../lib/identity.ts";

test("usernames are normalized and validated with the onboarding rules", () => {
  assert.equal(normalizeUsername("  Dinda.P "), "dinda.p");
  assert.equal(usernameError("dinda"), null);
  assert.equal(usernameError("d_i.n"), null);
  for (const bad of ["ab", "a".repeat(21), "_dinda", "dinda.", "din da", "Dinda!", "admin", "pancong"])
    assert.notEqual(usernameError(bad), null, bad);
});

test("a PIN is exactly six digits", () => {
  assert.equal(isValidPin("123456"), true);
  assert.equal(isValidPin("000000"), true);
  for (const bad of ["12345", "1234567", "12a456", " 123456", "", "١٢٣٤٥٦"]) assert.equal(isValidPin(bad), false, bad);
});

test("each avatar emoji maps to its onboarding color", () => {
  assert.equal(AVATAR_EMOJIS.length, 10);
  assert.equal(AVATAR_COLORS.length, 6);
  assert.equal(avatarColorFor("🔥"), "#FF5A1F");
  assert.equal(avatarColorFor("🌙"), AVATAR_COLORS[9 % 6]);
});

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
