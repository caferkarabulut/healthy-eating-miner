import assert from "node:assert/strict";
import test from "node:test";
import { AuthRequestError, authPost } from "./auth-client.ts";
import { initialRegisterState, registerFeedback, registerReducer } from "./register-feedback.ts";
import { registerPost } from "./register-gateway.ts";
const token = "a".repeat(64);
function request(email = "person@example.org", password = "abcdefgh", csrf = true) {
  return new Request("https://bite.test/api/auth/register", { method: "POST", headers: {
    Origin: "https://bite.test", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json",
    Cookie: `bite_csrf=${token}`, ...(csrf ? { "X-CSRF-Token": token } : {}),
  }, body: JSON.stringify({ email, password }) });
}
test("Identity codes become Turkish field errors without raw descriptions or private details", () => {
  const feedback = registerFeedback({ errors: { PasswordRequiresDigit: ["secret"], PasswordRequiresUpper: ["raw"], DuplicateEmail: ["private@email.test"], Unexpected: ["database detail"] } });
  assert.match(feedback.fieldErrors.password!, /rakam/); assert.match(feedback.fieldErrors.password!, /büyük harf/);
  assert.match(feedback.fieldErrors.email!, /Hesabınız varsa/);
  assert.doesNotMatch(JSON.stringify(feedback), /secret|private@|database detail|Unexpected/);
  for (const code of ["PasswordTooShort", "PasswordRequiresLower", "PasswordRequiresNonAlphanumeric", "InvalidEmail", "InvalidUserName", "DuplicateUserName"]) assert.ok(Object.keys(registerFeedback({ errors: { [code]: ["raw"] } }).fieldErrors).length);
  for (const value of [null, {}, { errors: ["raw"] }, { errors: { Unknown: ["raw"] } }]) assert.doesNotMatch(JSON.stringify(registerFeedback(value)), /raw/);
});
test("different valid email suffixes pass through unchanged without extra rules", async () => {
  for (const email of ["one@example.org", "two@example.net", "three@example.com.tr", "four@example.technology"]) {
    const response = await registerPost(request(email, "TestPassword1!"), async (_, init) => {
      assert.deepEqual(JSON.parse(init!.body as string), { email, password: "TestPassword1!" });
      assert.equal(init?.cache, "no-store"); return new Response(null, { status: 200 });
    });
    assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
test("correct fields then resubmit without reload: failure unlocks, fresh CSRF, success", async () => {
  let state = { ...initialRegisterState, email: "retry@example.org", password: "abcdefgh" };
  let csrfCalls = 0; let writes = 0;
  const fetcher: typeof fetch = async (url, init) => {
    if (url === "/api/auth/csrf") { csrfCalls++; return Response.json({ token }); }
    assert.equal(new Headers(init?.headers).get("X-CSRF-Token"), token); writes++;
    const body = JSON.parse(init!.body as string);
    return registerPost(request(body.email, body.password), async () => body.password === "abcdefgh"
      ? Response.json({ errors: { PasswordRequiresDigit: ["raw"], PasswordRequiresUpper: ["raw"] } }, { status: 400 }) : new Response(null, { status: 200 }));
  };
  state = registerReducer(state, { type: "submit" }); assert.equal(state.loading, true);
  try { await authPost("/api/auth/register", { email: state.email, password: state.password }, fetcher); assert.fail(); }
  catch (error) { assert.ok(error instanceof AuthRequestError); state = registerReducer(state, { type: "failure", error: error.message, fieldErrors: error.fieldErrors }); }
  assert.equal(state.loading, false); assert.match(state.fieldErrors.password!, /rakam/);
  state = registerReducer(state, { type: "change", field: "email", value: "retry@example.technology" }); assert.ok(state.fieldErrors.password);
  state = registerReducer(state, { type: "change", field: "password", value: "TestPassword1!" });
  assert.equal(state.fieldErrors.password, undefined); assert.equal(state.error, "");
  state = registerReducer(state, { type: "submit" });
  await authPost("/api/auth/register", { email: state.email, password: state.password }, fetcher);
  state = registerReducer(state, { type: "success" });
  assert.equal(state.loading, false); assert.equal(state.success, true); assert.equal(state.password, "");
  assert.equal(csrfCalls, 2); assert.equal(writes, 2);
});
test("CSRF failure releases form for another manual attempt; gateway sanitizes upstream failures", async () => {
  let calls = 0;
  await assert.rejects(authPost("/api/auth/register", {}, async () => { calls++; return new Response(null, { status: 503 }); }), /Güvenlik/);
  assert.equal(calls, 1);
  let state = registerReducer(initialRegisterState, { type: "submit" });
  state = registerReducer(state, { type: "failure", error: "Bağlantı hatası" }); assert.equal(state.loading, false);
  state = registerReducer(state, { type: "change", field: "email", value: "a@example.net" }); assert.equal(state.error, "");
  const fake: typeof fetch = async () => { calls++; return new Response("sensitive details", { status: 500 }); };
  assert.equal((await registerPost(request(undefined, undefined, false), fake)).status, 403); assert.equal(calls, 1);
  const failed = await registerPost(request(), fake); assert.equal(failed.status, 502); assert.doesNotMatch(await failed.text(), /sensitive/);
});
