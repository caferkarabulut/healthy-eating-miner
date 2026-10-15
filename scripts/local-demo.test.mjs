import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { assertPortFree, preflightErrors, startService, stopServices, waitReady } from "./local-demo.mjs";

test("occupied port fails without closing the existing listener", async () => {
  const server = createServer((_, response) => response.end("existing"));
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const port = server.address().port;
  try {
    await assert.rejects(assertPortFree(port), /portu kullanılıyor/);
    assert.equal(await (await fetch(`http://127.0.0.1:${port}`)).text(), "existing");
  } finally { await new Promise((resolve) => server.close(resolve)); }
  await assertPortFree(port);
});
test("readiness requires HTTP 200; timeout and process exit fail clearly", async () => {
  let ready = false;
  const server = createServer((_, response) => { response.statusCode = ready ? 200 : 503; response.end(); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await assert.rejects(waitReady(url, [], new AbortController().signal, 50), /zamanında hazır olmadı/);
    ready = true;
    await waitReady(url, [], new AbortController().signal, 1000);
    await assert.rejects(waitReady(url, [{ exitCode: 1, signalCode: null }], new AbortController().signal), /hazır olmadan kapandı/);
    const controller = new AbortController(); controller.abort();
    await waitReady(url, [], controller.signal);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
test("shutdown closes only its service group, including descendants", async () => {
  const owned = startService(process.execPath, ["-e", "require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); setInterval(()=>{},1000)"], process.cwd(), process.env);
  const unrelated = startService(process.execPath, ["-e", "setInterval(()=>{},1000)"], process.cwd(), process.env);
  try {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await stopServices([owned]);
    assert.throws(() => process.kill(-owned.pid, 0), { code: "ESRCH" });
    assert.doesNotThrow(() => process.kill(unrelated.pid, 0));
  } finally { await stopServices([owned, unrelated]); }
});
test("preflight errors give explicit manual migration/seed guidance without credentials", () => {
  assert.match(preflightErrors[13], /dotnet ef database update/);
  assert.match(preflightErrors[14], /psql seed/);
  assert.match(preflightErrors[11], /Test\/uzak DB/);
  for (const message of Object.values(preflightErrors)) assert.doesNotMatch(message, /Password=|Username=|@example/);
});
