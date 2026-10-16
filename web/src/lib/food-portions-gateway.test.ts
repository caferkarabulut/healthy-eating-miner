import assert from "node:assert/strict";
import test from "node:test";
import { foodPortionsGet } from "./food-portions-gateway.ts";
test("public measures proxy retains source data and empty lists without forwarding cookies", async () => {
  for (const items of [[], [{ id: 1, measureName: "cup (USDA ölçüsü)", amount: 0.5, gramWeight: 52 }]]) {
    const response = await foodPortionsGet("1", async (url, init) => {
      assert.match(String(url), /\/meals\/1\/portions$/); assert.equal(init?.cache, "no-store");
      assert.equal(new Headers(init?.headers).get("cookie"), null);
      return Response.json({ mealId: 1, items });
    });
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { mealId: 1, items });
  }
});
test("measure loading failures remain safe, enabling the independent gram fallback", async () => {
  assert.equal((await foodPortionsGet("../auth", async () => { throw new Error(); })).status, 400);
  assert.equal((await foodPortionsGet("1", async () => { throw new Error("private detail"); })).status, 502);
  assert.equal((await foodPortionsGet("1", async () => new Response(null, { status: 404 }))).status, 404);
  const bad = await foodPortionsGet("1", async () => new Response("private detail", { status: 500 }));
  assert.equal(bad.status, 502); assert.doesNotMatch(await bad.text(), /private detail/);
});
