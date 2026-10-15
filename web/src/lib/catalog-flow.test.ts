import assert from "node:assert/strict";
import test from "node:test";
import { foodLabel } from "./catalog-presentation.ts";
import { loginToCatalog } from "./login-flow.ts";

test("catalog labels preserve preparation, long names and nested parentheses without truncation", () => {
  for (const original of ["Yumurta (çiğ)", "Bulgur (pişmiş)", "Makarna (kuru, zenginleştirilmemiş)", "Sığır kıyması (%15 yağlı, yassı parça, üstten ızgara)", "Gıda (pişmiş (yağsız))"]) {
    const label = foodLabel(original);
    assert.equal(`${label.name} (${label.preparation})`, original);
  }
  assert.deepEqual(foodLabel("Feta peyniri"), { name: "Feta peyniri", preparation: "" });
});
test("login verifies HttpOnly session through private /me before returning catalog destination", async () => {
  const calls: string[] = [];
  const destination = await loginToCatalog({ email: "test@example.org", password: "fixture" }, async (url, init) => {
    calls.push(String(url));
    assert.equal(init?.credentials, "same-origin");
    if (url === "/api/auth/csrf") return Response.json({ token: "a".repeat(64) });
    if (url === "/api/auth/login") return Response.json({ ok: true });
    assert.equal(init?.cache, "no-store"); return Response.json({ authenticated: true });
  });
  assert.equal(destination, "/"); assert.deepEqual(calls, ["/api/auth/csrf", "/api/auth/login", "/api/auth/me"]);
});
test("failed login or session verification does not return a navigation destination", async () => {
  for (const failure of ["/api/auth/login", "/api/auth/me"]) {
    const calls: string[] = [];
    await assert.rejects(loginToCatalog({ email: "test@example.org", password: "fixture" }, async (url) => {
      calls.push(String(url));
      if (url === "/api/auth/csrf") return Response.json({ token: "a".repeat(64) });
      return url === failure ? Response.json({ error: "Giriş yapılamadı." }, { status: 401 }) : Response.json({ ok: true });
    }));
    if (failure === "/api/auth/login") assert.equal(calls.includes("/api/auth/me"), false);
  }
});
