import assert from "node:assert/strict";
import test from "node:test";
import { IDENTITY_COOKIE, identityCookieFromResponse } from "./session.ts";

test("extracts only Identity's application cookie", () => {
  const response = new Response(null, { headers: { "Set-Cookie": `${IDENTITY_COOKIE}=opaque-value; path=/; httponly` } });
  assert.equal(identityCookieFromResponse(response), "opaque-value");
  assert.equal(identityCookieFromResponse(new Response(null)), null);
});
