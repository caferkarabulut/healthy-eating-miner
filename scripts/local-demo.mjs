#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = join(root, "backend-dotnet");
const project = join(backend, "src/BiteRoutine.Api");
const dll = join(project, "bin/Release/net10.0/BiteRoutine.Api.dll");
const web = join(root, "web");
const next = join(web, "node_modules/next/dist/bin/next");
const buildHint = "backend-dotnet içinde: dotnet restore BiteRoutine.slnx && dotnet build BiteRoutine.slnx --no-restore --configuration Release";

export const preflightErrors = {
  10: "Geliştirme bağlantı ayarı eksik/geçersiz. docs/local-setup.md ve backend-dotnet/README.md içindeki yerel ayarları kontrol edin.",
  11: "Demo yalnız yerel bite_routine geliştirme DB'sini ve public şemasını kullanır. Test/uzak DB ayarını kullanmayın.",
  12: "PostgreSQL'e erişilemiyor veya şema okunamıyor. Yerel PostgreSQL hizmetini ve bağlantı ayarlarını kontrol edin; gizli değerleri paylaşmayın.",
  13: "Migration eksik. Hedefin yerel bite_routine olduğunu doğrulayıp backend-dotnet içinde ASPNETCORE_ENVIRONMENT=Development dotnet ef database update --project src/BiteRoutine.Api --no-build --configuration Release çalıştırın. Demo veri değiştirmedi.",
  14: "Kaynaklı katalog seed'i eksik. docs/local-setup.md içindeki açık psql seed adımını, yalnız geliştirme DB'sinde uygulayın. Demo veri değiştirmedi.",
  15: "Kaynak eşleme dosyası bulunamadı. Komutu tam depo kopyası içinde çalıştırın.",
  16: "Yerel demo PostgreSQL 17 gerektirir. docs/local-setup.md içindeki kurulumu kontrol edin.",
};

export async function assertPortFree(port) {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", () => reject(new Error(`${port} portu kullanılıyor veya dinlenemiyor. Başka süreç kapatılmadı.`)));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, resolve);
  });
  await new Promise((resolve) => server.close(resolve));
}

function newestSource(directory) {
  let newest = 0;
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (["bin", "obj"].includes(item.name)) continue;
    const path = join(directory, item.name);
    if (item.isDirectory()) newest = Math.max(newest, newestSource(path));
    else if (/\.(cs|csproj|props|targets)$/.test(item.name)) newest = Math.max(newest, statSync(path).mtimeMs);
  }
  return newest;
}

export function startService(command, args, cwd, env) {
  // Each service owns a separate process group, including its descendants.
  return spawn(command, args, { cwd, env, detached: true, stdio: "ignore" });
}
export async function stopServices(children) {
  const stop = (child, signal) => {
    if (!child.pid) return;
    try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== "ESRCH") throw error; }
  };
  for (const child of children) stop(child, "SIGTERM");
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    const alive = children.some((child) => {
      if (!child.pid) return false;
      try { process.kill(-child.pid, 0); return true; } catch { return false; }
    });
    if (!alive) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  for (const child of children) stop(child, "SIGKILL");
}

export async function waitReady(url, children, signal, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !signal.aborted) {
    if (children.some((child) => child.exitCode !== null || child.signalCode !== null || child.spawnError))
      throw new Error("Demo servisi hazır olmadan kapandı. Kurulum belgesindeki bağımlılık/derleme adımlarını kontrol edin.");
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]) });
      await response.body?.cancel();
      if (response.status === 200) return;
    } catch { /* Retry readiness reads only; never mutate data. */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!signal.aborted) throw new Error("Servis zamanında hazır olmadı. docs/local-setup.md içindeki sorun giderme adımlarını kontrol edin.");
}

export async function main() {
  if (process.platform === "win32") throw new Error("Bu yerel başlatıcı macOS/Linux içindir.");
  if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("Node.js 24 kullanın.");
  if (!existsSync(next) || ["typescript", "@types/react", "@types/node", "react", "react-dom"].some((name) =>
    !existsSync(join(web, "node_modules", name, "package.json"))))
    throw new Error("Web bağımlılıkları eksik. Bir kez web içinde npm ci çalıştırın.");
  if (!existsSync(dll) || newestSource(project) > statSync(dll).mtimeMs)
    throw new Error(`API Release derlemesi eksik/güncel değil. ${buildHint}`);
  const sdk = spawnSync("dotnet", ["--version"], { cwd: backend, encoding: "utf8", timeout: 15000 });
  if (sdk.status !== 0 || !sdk.stdout.trim().startsWith("10.")) throw new Error(".NET SDK 10 bulunamadı. backend-dotnet/global.json sürümünü kurun.");
  await assertPortFree(5080);
  await assertPortFree(3000);
  const env = { ...process.env, ASPNETCORE_ENVIRONMENT: "Development", DOTNET_ENVIRONMENT: "Development", NODE_ENV: "development", BITE_ROUTINE_API_URL: "http://127.0.0.1:5080" };
  const children = [];
  const controller = new AbortController();
  let stopping;
  const shutdown = () => {
    controller.abort();
    stopping ??= stopServices(children);
    return stopping;
  };
  const onSignal = () => { void shutdown(); };
  process.on("SIGINT", onSignal); process.on("SIGTERM", onSignal);
  const launch = (command, args, cwd) => {
    const child = startService(command, args, cwd, env);
    child.on("error", () => { child.spawnError = true; });
    children.push(child);
    return child;
  };
  try {
    console.log("Yerel PostgreSQL, ayarlar, migration ve kaynaklı katalog kontrol ediliyor...");
    const check = launch("dotnet", [dll, "--check-local-demo"], project);
    const status = await new Promise((resolve) => { check.once("exit", resolve); check.once("error", () => resolve(-1)); });
    children.splice(children.indexOf(check), 1);
    if (controller.signal.aborted) return;
    if (status !== 0) throw new Error(preflightErrors[status] ?? "Yerel ayarlar kontrol edilemedi. docs/local-setup.md belgesini inceleyin.");
    // Check again after preflight; an explicit port prevents Next's automatic fallback.
    await assertPortFree(5080); await assertPortFree(3000);
    if (controller.signal.aborted) return;
    const api = launch("dotnet", [dll, "--urls", "http://127.0.0.1:5080"], project);
    await waitReady("http://127.0.0.1:5080/health/live", [api], controller.signal);
    if (controller.signal.aborted) return;
    const site = launch(process.execPath, [next, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3000"], web);
    await waitReady("http://127.0.0.1:3000/login", [api, site], controller.signal);
    await waitReady("http://127.0.0.1:3000", [api, site], controller.signal);
    if (controller.signal.aborted) return;
    console.log("Demo hazır: http://127.0.0.1:3000\nAPI: http://127.0.0.1:5080\nDurdurmak için Ctrl+C. Hesap bilgileri oluşturulmadı veya kaydedilmedi.");
    await new Promise((resolve, reject) => {
      controller.signal.addEventListener("abort", resolve, { once: true });
      for (const child of [api, site]) {
        child.once("exit", () => reject(new Error("Demo servisi kapandı; diğer demo servisi de durduruluyor.")));
        if (child.exitCode !== null || child.signalCode !== null) reject(new Error("Demo servisi kapandı."));
      }
    });
  } finally {
    await shutdown();
    process.off("SIGINT", onSignal); process.off("SIGTERM", onSignal);
    console.log("Demo süreçleri durduruldu.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(`Demo başlatılamadı: ${error.message}`); process.exitCode = 1; });
}
