#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { connect } from 'node:net';
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { assertPortFree, stopServices, waitReady, preflightErrors, newestSource } from './local-demo.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mobile = join(root, 'mobile');
const project = join(root, 'backend-dotnet/src/BiteRoutine.Api');
const dll = join(project, 'bin/Release/net10.0/BiteRoutine.Api.dll');

export function route(method, target) {
  if (!target?.startsWith('/') || target.startsWith('//')) return null;
  const path = new URL(target, 'http://localhost').pathname;
  const read = method === 'GET' || method === 'HEAD';
  if (read && (/^\/meals(?:\/[1-9]\d*(?:\/portions)?)?$/.test(path) ||
      ['/health/live', '/me', '/me/diary-entries'].includes(path))) return 'api';
  if (method === 'POST' && ['/auth/register', '/auth/login', '/auth/refresh', '/me/diary-entries'].includes(path)) return 'api';
  if (['PATCH', 'DELETE'].includes(method) && /^\/me\/diary-entries\/[a-f0-9-]{36}$/i.test(path)) return 'api';
  if (read && (['/', '/status', '/_expo/open', '/_expo/loading', '/_expo/link'].includes(path) ||
      path.startsWith('/assets/') || /\.(bundle|map)$/.test(path))) return 'metro';
  if (method === 'POST' && path === '/symbolicate') return 'metro';
  return null;
}

const hopHeaders = new Set(['host', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
export const syntheticEmail = value => typeof value === 'string' && /^mobile-tunnel-test-[a-z0-9-]{1,64}@example\.test$/i.test(value);
function headersFor(headers, kind, origin) {
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    if (hopHeaders.has(key) || key.startsWith('x-forwarded-') || key.startsWith('cf-')) continue;
    if (key === 'cookie' || kind === 'metro' && key === 'authorization') continue;
    result[key] = value;
  }
  result.host = origin ? new URL(origin).host : 'localhost';
  result['x-forwarded-proto'] = 'https';
  return result;
}

export function createGateway({ apiPort, metroPort, getOrigin, getPage = () => null }) {
  const sockets = new Set();
  const lifetime = new AbortController();
  const localApi = `http://127.0.0.1:${apiPort}`;
  async function syntheticSession(authorization) {
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return false;
    try {
      const response = await fetch(`${localApi}/me`, { headers: { Authorization: authorization },
        credentials: 'omit', redirect: 'error', signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(5000)]) });
      if ([401, 403].includes(response.status)) return false;
      if (!response.ok) return null;
      const profile = await response.json();
      return typeof profile?.email === 'string' ? syntheticEmail(profile.email) : null;
    } catch { return null; }
  }
  async function handle(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET' && req.url === '/__bite-connect') {
      const page = getPage();
      res.writeHead(page ? 200 : 503, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page ?? 'Bağlantı hazırlanıyor.'); return;
    }
    const kind = route(req.method, req.url);
    if (!kind) { res.writeHead(404); res.end(); return; }
    if (Number(req.headers['content-length'] ?? 0) > 65536) { res.writeHead(413); res.end(); return; }
    const path = new URL(req.url, 'http://localhost').pathname;
    if (kind === 'api' && /^\/me(?:\/|$)/.test(path)) {
      const session = await syntheticSession(req.headers.authorization);
      if (session !== true) {
        res.writeHead(session === null ? 503 : 403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: session === null ? 'Yerel API şu anda kullanılamıyor; yeniden deneyin.' : 'Bu geliştirme bağlantısı yalnız sentetik test hesaplarını kabul eder.' })); return;
      }
    }
    if (kind === 'api' && path.startsWith('/auth/')) {
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 65536) { res.writeHead(413); res.end(); return; }
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { res.writeHead(400); res.end(); return; }
      if (!body || typeof body !== 'object' || Array.isArray(body)) { res.writeHead(400); res.end(); return; }
      if (path !== '/auth/refresh' && !syntheticEmail(body.email)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Yalnız mobile-tunnel-test-…@example.test hesabını kullanın.' })); return;
      }
      const response = await fetch(`${localApi}${path}?useCookies=false&useSessionCookies=false`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        credentials: 'omit', redirect: 'error', signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(15000)]),
      });
      const text = await response.text();
      if (response.ok && path !== '/auth/register') {
        let token;
        try { token = JSON.parse(text).accessToken; } catch { /* reject malformed response below */ }
        const session = token ? await syntheticSession(`Bearer ${token}`) : null;
        if (session !== true) {
          res.writeHead(session === null ? 503 : 403); res.end(); return;
        }
      }
      res.writeHead(response.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(text); return;
    }
    const upstream = httpRequest({ hostname: '127.0.0.1', port: kind === 'api' ? apiPort : metroPort,
      method: req.method, path: req.url, headers: headersFor(req.headers, kind, getOrigin()), timeout: 60000 }, response => {
      const headers = Object.fromEntries(Object.entries(response.headers).filter(([name]) => !hopHeaders.has(name)));
      res.writeHead(response.statusCode, { ...headers, 'cache-control': 'no-store' });
      response.pipe(res);
    });
    let bytes = 0;
    req.on('data', chunk => { bytes += chunk.length; if (bytes > 65536) { upstream.destroy(); if (!res.headersSent) res.writeHead(413); res.end(); } });
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => { if (res.destroyed || res.writableEnded) return; if (!res.headersSent) res.writeHead(502); res.end(); });
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => upstream.destroy());
    req.pipe(upstream);
  }
  const server = createServer((req, res) => {
    void handle(req, res).catch(() => { if (res.destroyed || res.writableEnded) return; if (!res.headersSent) res.writeHead(502); res.end(); });
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  server.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/') || req.url.startsWith('//')) { socket.destroy(); return; }
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (!['/hot', '/message'].includes(path) || req.method !== 'GET' || req.headers.upgrade?.toLowerCase() !== 'websocket') {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n'); return;
    }
    const upstream = connect(metroPort, '127.0.0.1');
    sockets.add(upstream);
    upstream.once('connect', () => {
      const headers = { ...headersFor(req.headers, 'metro', getOrigin()), connection: 'Upgrade', upgrade: 'websocket' };
      upstream.write(`GET ${req.url} HTTP/1.1\r\n${Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n`);
      if (head.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    upstream.on('error', () => socket.destroy()); socket.on('error', () => upstream.destroy());
    upstream.on('close', () => { sockets.delete(upstream); socket.destroy(); });
    socket.on('close', () => upstream.destroy());
  });
  return { server, close: async () => { lifetime.abort(); for (const socket of sockets) socket.destroy(); await new Promise(r => server.close(r)); } };
}

export function tunnelAddress(output) {
  return output.match(/https:\/\/(?!api\.)[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com(?=[\s/|]|$)/)?.[0] ?? null;
}

export function secureExpoGoLink(value) {
  // Expo Go maps exp to HTTP, exps to HTTPS. Keep the public manifest encrypted too.
  return value.replace(/^exp:\/\//, 'exps://');
}

export function qrSvg(value, toQR) {
  const pixels = toQR(value); const size = Math.sqrt(pixels.length);
  let rectangles = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
    if (pixels[y * size + x]) rectangles += `<rect x="${x + 4}" y="${y + 4}" width="1" height="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 8} ${size + 8}" width="320" height="320" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><g fill="black">${rectangles}</g></svg>`;
}
const escape = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function toolEnvironment(source) {
  const names = new Set(['PATH', 'HOME', 'TMPDIR', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TERM',
    'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy',
    'SSL_CERT_FILE', 'SSL_CERT_DIR', 'NODE_EXTRA_CA_CERTS', 'NODE_OPTIONS']);
  return Object.fromEntries(Object.entries(source).filter(([key]) => names.has(key)));
}
export function launchPage(links, toQR) {
  return `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Bite Routine telefon testi</title><style>body{font:18px system-ui;background:#f7f8f4;color:#173e30;max-width:760px;margin:24px auto;padding:16px}section{display:inline-block;vertical-align:top;margin:8px}a{display:block;margin:12px 0;color:#173e30}svg{max-width:100%;height:auto}</style><h1>Telefon testi hazır</h1><p>Mac açık kalmalı. Sertifika veya kablo gerekmez. Bu genel bağlantı yalnız <strong>mobile-tunnel-test-iphone@example.test</strong> gibi sentetik hesapları kabul eder. Gerçek e-posta/parolanızı girmeyin. Test trafiği Cloudflare üzerinden geçer.</p>${Object.entries(links).map(([label, url]) => `<section><h2>${escape(label)}</h2>${qrSvg(url, toQR)}<a href="${escape(url)}">${escape(label)} ile aç</a></section>`).join('')}<p>Adres değiştiyse yeniden giriş gerekir. Durdurmak için komutun çalıştığı terminalde Ctrl+C.</p></html>`;
}

function settingsEnvironment() {
  const env = { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', DOTNET_ENVIRONMENT: 'Development' };
  if (!env.ConnectionStrings__BiteRoutine) {
    const common = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' });
    const primaryRoot = common.status === 0 ? dirname(common.stdout.trim()) : root;
    const local = join(project, 'appsettings.Development.json');
    const path = existsSync(local) ? local : join(primaryRoot, 'backend-dotnet/src/BiteRoutine.Api/appsettings.Development.json');
    try { env.ConnectionStrings__BiteRoutine = JSON.parse(readFileSync(path, 'utf8')).ConnectionStrings?.BiteRoutine; }
    catch { throw new Error(preflightErrors[10]); }
  }
  return env;
}

export async function main() {
  if (process.platform === 'win32' || !process.versions.node.startsWith('24.')) throw new Error('Mac/Linux ve Node 24 gereklidir.');
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('TLS doğrulaması kapalı; bu ayarla test başlatılmaz.');
  const require = createRequire(join(mobile, 'package.json'));
  let expo, toQR;
  try { expo = require.resolve('expo/bin/cli'); ({ toQR } = require('toqr')); } catch { throw new Error('Önce mobile/ içinde bir kez npm ci çalıştırın.'); }
  if (!existsSync(dll) || newestSource(project) > statSync(dll).mtimeMs) {
    console.log('API derlemesi eksik/değişmiş; yalnız gerekli Release derlemesi hazırlanıyor...');
    const build = spawnSync('dotnet', ['build', 'src/BiteRoutine.Api/BiteRoutine.Api.csproj', '--configuration', 'Release'],
      { cwd: join(root, 'backend-dotnet'), stdio: 'ignore', timeout: 180000 });
    if (build.status !== 0) throw new Error('API Release derlenemedi; backend-dotnet yerel kurulumunu kontrol edin. DB değiştirilmedi.');
  }
  if (spawnSync('cloudflared', ['--version'], { stdio: 'ignore' }).status !== 0) throw new Error('Önce bir kez brew install cloudflared çalıştırın.');
  const apiPort = 5086, metroPort = 8087, gatewayPort = 8097;
  for (const port of [apiPort, metroPort, gatewayPort]) await assertPortFree(port);
  const apiEnv = settingsEnvironment();
  const children = new Set(); const controller = new AbortController();
  let stopping = false, stoppingPromise, failure, publicOrigin, page, gateway;
  const temporary = mkdtempSync(join(tmpdir(), 'bite-mobile-test-'));
  writeFileSync(join(temporary, 'cloudflared.yml'), '{}\n', { mode: 0o600 });
  const shutdownSignal = () => { stopping = true; controller.abort(); stoppingPromise ??= stopServices([...children]); };
  process.on('SIGINT', shutdownSignal); process.on('SIGTERM', shutdownSignal);
  const launch = (name, command, args, cwd, env, watched = true) => {
    const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    children.add(child);
    const failed = () => { if (watched && !stopping) { failure = new Error(`${name} kapandı; test bağlantıları durduruluyor.`); controller.abort(); } };
    child.on('error', failed); child.on('exit', () => { if (!watched) children.delete(child); failed(); });
    // Drain without logging API bodies, passwords, tokens, Metro device logs or headers.
    child.stdout.resume(); child.stderr.resume();
    return child;
  };
  try {
    console.log('Yerel PostgreSQL 17, geliştirme DB hedefi ve katalog salt okunur kontrol ediliyor...');
    const check = launch('DB kontrolü', 'dotnet', [dll, '--check-local-demo'], project, apiEnv, false);
    const status = await new Promise(r => { check.once('exit', r); check.once('error', () => r(-1)); });
    if (controller.signal.aborted) return;
    if (status !== 0) throw new Error(preflightErrors[status] ?? 'Yerel DB kontrolü başarısız.');
    const api = launch('API', 'dotnet', [dll, '--urls', `http://127.0.0.1:${apiPort}`], project, apiEnv);
    await waitReady(`http://127.0.0.1:${apiPort}/health/live`, [api], controller.signal);
    if (controller.signal.aborted) { if (failure) throw failure; return; }
    gateway = createGateway({ apiPort, metroPort, getOrigin: () => publicOrigin, getPage: () => page });
    await new Promise((r, reject) => { gateway.server.once('error', reject); gateway.server.listen(gatewayPort, '127.0.0.1', r); });
    const cloudEnv = toolEnvironment(process.env);
    const tunnel = launch('Ücretsiz tünel', 'cloudflared', ['tunnel', '--config', join(temporary, 'cloudflared.yml'), '--no-autoupdate',
      '--protocol', 'http2', '--metrics', '127.0.0.1:0', '--loglevel', 'info', '--url', `http://127.0.0.1:${gatewayPort}`], root, cloudEnv);
    let output = '';
    const capture = chunk => { output = (output + chunk.toString()).slice(-16000); publicOrigin ??= tunnelAddress(output); };
    tunnel.stdout.on('data', capture); tunnel.stderr.on('data', capture);
    const deadline = Date.now() + 60000;
    while (!publicOrigin && !controller.signal.aborted && Date.now() < deadline) await new Promise(r => setTimeout(r, 100));
    if (controller.signal.aborted) { if (failure) throw failure; return; }
    if (!publicOrigin) throw new Error('Ücretsiz tünel adresi alınamadı. Ücretli yönteme geçilmedi.');
    const metroEnv = toolEnvironment(process.env);
    Object.assign(metroEnv, { NODE_ENV: 'development', EXPO_NO_DOTENV: '1', EXPO_NO_TELEMETRY: '1',
      EXPO_PUBLIC_API_URL: publicOrigin, EXPO_PACKAGER_PROXY_URL: publicOrigin, EX_DEV_CLIENT_NETWORK_INSPECTOR: 'false',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --dns-result-order=ipv4first`.trim() });
    // A new origin must not reuse a JS transform that still embeds the previous origin.
    const metro = launch('Expo', process.execPath, [expo, 'start', '--dev-client', '--localhost', '--clear', '--port', String(metroPort)], mobile, metroEnv);
    await waitReady(`http://127.0.0.1:${metroPort}/status`, [api, tunnel, metro], controller.signal, 120000);
    await waitReady(`${publicOrigin}/health/live`, [api, tunnel, metro], controller.signal, 90000);
    await waitReady(`${publicOrigin}/status`, [api, tunnel, metro], controller.signal);
    if (controller.signal.aborted) { if (failure) throw failure; return; }
    const info = async (platform, runtime) => {
      const response = await fetch(`${publicOrigin}/_expo/open?platform=${platform}&runtime=${runtime}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Telefon açma bağlantısı alınamadı.');
      const value = await response.json();
      if (typeof value.url !== 'string' || !decodeURIComponent(value.url).includes(new URL(publicOrigin).host)) throw new Error('Telefon bağlantısı geçerli tüneli kullanmıyor.');
      return value.url;
    };
    const links = { iPhone: await info('ios', 'custom'), 'Android Expo Go': secureExpoGoLink(await info('android', 'expo')), 'Android development build': await info('android', 'custom') };
    page = launchPage(links, toQR);
    console.log(`\nTELEFON TESTİ HAZIR\nQR sayfası: http://127.0.0.1:${gatewayPort}/__bite-connect\nTelefon için sayfa: ${publicOrigin}/__bite-connect\niPhone: ${links.iPhone}\nAndroid Expo Go: ${links['Android Expo Go']}\n\nMac açık kalmalı. Yeni tünel adresinde yeniden giriş gerekir. Ctrl+C yalnız bu komutun servislerini kapatır.`);
    if (process.stdout.isTTY && process.platform === 'darwin') {
      const browser = spawn('open', [`http://127.0.0.1:${gatewayPort}/__bite-connect`], { stdio: 'ignore' });
      browser.on('error', () => {}); browser.unref();
    }
    await new Promise(r => { if (controller.signal.aborted) r(); else controller.signal.addEventListener('abort', r, { once: true }); });
    if (failure) throw failure;
  } finally {
    stopping = true; controller.abort();
    await (stoppingPromise ??= stopServices([...children]));
    await gateway?.close();
    rmSync(temporary, { recursive: true, force: true });
    process.off('SIGINT', shutdownSignal); process.off('SIGTERM', shutdownSignal);
    console.log('Test tüneli ve bu komutun API/Expo süreçleri kapatıldı. PostgreSQL ve önceden açık süreçler korundu.');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error => { console.error(`Telefon testi başlatılamadı: ${error.message}`); process.exitCode = 1; });
