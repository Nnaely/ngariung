import assert from "node:assert/strict";
import test from "node:test";
import { hashPin, verifyPin } from "../lib/server/pin.ts";

test("the same PIN hashes differently each time (random salt) and never appears in the hash", async () => {
  const first = await hashPin("123456");
  const second = await hashPin("123456");
  assert.notEqual(first, second);
  assert.match(first, /^scrypt\$/);
  assert.equal(first.includes("123456"), false);
});

test("only the right PIN verifies", async () => {
  const stored = await hashPin("482913");
  assert.equal(await verifyPin("482913", stored), true);
  assert.equal(await verifyPin("482914", stored), false);
  assert.equal(await verifyPin("", stored), false);
});

test("a damaged stored hash is rejected instead of throwing", async () => {
  for (const stored of ["", "plain-text", "scrypt$abc", "bcrypt$a$b", "scrypt$AAAA$AAAA"]) {
    assert.equal(await verifyPin("123456", stored), false, stored);
  }
});
