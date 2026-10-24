import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createGateway, route, tunnelAddress, syntheticEmail, secureExpoGoLink, toolEnvironment } from './mobile-test.mjs';
import { stopServices, assertPortFree } from './local-demo.mjs';
const listen = server => new Promise(r => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const close = server => new Promise(r => { server.closeAllConnections?.(); server.close(r); });

test('only mobile API and necessary Metro routes are forwarded', () => {
  assert.equal(route('GET', '/meals?search=YOĞURT'), 'api');
  assert.equal(route('PATCH', '/me/diary-entries/11111111-1111-4111-8111-111111111111'), 'api');
  assert.equal(route('GET', '/node_modules/expo-router/entry.bundle?platform=ios'), 'metro');
  for (const [method, url] of [['POST', '/_expo/open'], ['GET', '/json/list'], ['GET', '/auth/manage/info'],
    ['GET', '/swagger'], ['POST', '/me/favorite-meals'], ['PATCH', '/me/favorite-meals/1'], ['PUT', '/me/favorite-meals/0'],
    ['PUT', '/me/favorite-meals/2147483648'], ['PUT', '/me/favorite-meals/1/extra'], ['GET', 'http://other.test/meals'], ['GET', '//other.test/meals']])
    assert.equal(route(method, url), null);
  for (const [method, url] of [['GET', '/me/favorite-meals?page=1&pageSize=100'], ['PUT', '/me/favorite-meals/1'], ['DELETE', '/me/favorite-meals/2147483647']])
    assert.equal(route(method, url), 'api');
});

test('synthetic test identities are explicit, never ordinary local accounts', () => {
  assert.ok(syntheticEmail('mobile-tunnel-test-iphone@example.test'));
  for (const email of ['user@gmail.com', 'iphone@example.test', 'mobile-tunnel-test-x@example.com', '', null])
    assert.equal(syntheticEmail(email), false);
  assert.equal(tunnelAddress('Tunnel created https://first-second-third.trycloudflare.com |'), 'https://first-second-third.trycloudflare.com');
  assert.equal(tunnelAddress('https://api.trycloudflare.com/tunnel'), null);
  assert.equal(tunnelAddress('https://first-second.trycloudflare.com.evil.test'), null);
  assert.equal(secureExpoGoLink('exp://test-one.trycloudflare.com'), 'exps://test-one.trycloudflare.com');
  assert.deepEqual(toolEnvironment({ PATH: '/bin', ConnectionStrings__BiteRoutine: 'private', PGPASSWORD: 'private',
    EXPO_TOKEN: 'private', TUNNEL_TOKEN: 'private', EXPO_PUBLIC_API_URL: 'old', HOME: '/user' }), { PATH: '/bin', HOME: '/user' });
});

test('real-account login, refresh, bearer and cookies cannot expose local user data', async () => {
  const calls = [];
  const api = createServer(async (req, res) => {
    calls.push(req.url);
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/me') {
      if (req.headers.authorization === 'Bearer unavailable') { res.writeHead(503); res.end(); return; }
      res.end(JSON.stringify({ email: req.headers.authorization === 'Bearer synthetic' ? 'mobile-tunnel-test-iphone@example.test' : 'real@example.com' }));
    } else if (req.url.startsWith('/auth/refresh')) res.end(JSON.stringify({ accessToken: 'real', refreshToken: 'private-real-refresh' }));
    else if (req.url.startsWith('/auth/login')) res.end(JSON.stringify({ accessToken: 'synthetic', refreshToken: 'synthetic-refresh' }));
    else res.end(JSON.stringify({ cookie: req.headers.cookie ?? null, authorization: req.headers.authorization ?? null }));
  });
  const metro = createServer((req, res) => res.end(JSON.stringify({ cookie: req.headers.cookie ?? null, authorization: req.headers.authorization ?? null })));
  const apiPort = await listen(api), metroPort = await listen(metro);
  const gateway = createGateway({ apiPort, metroPort, getOrigin: () => 'https://test-one.trycloudflare.com' });
  const origin = `http://127.0.0.1:${await listen(gateway.server)}`;
  try {
    const post = (path, body) => fetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await post('/auth/login', { email: 'real@example.com', password: 'synthetic-not-real' })).status, 403);
    assert.equal(calls.length, 0, 'real login is rejected before the local API');
    const deniedRefresh = await post('/auth/refresh', { refreshToken: 'synthetic-test-fixture' });
    assert.equal(deniedRefresh.status, 403);
    assert.ok(!(await deniedRefresh.text()).includes('private-real-refresh'));
    assert.equal((await fetch(origin + '/me', { headers: { Authorization: 'Bearer real' } })).status, 403);
    for (const method of ['PUT', 'DELETE']) {
      assert.equal((await fetch(origin + '/me/favorite-meals/1', { method, headers: { Authorization: 'Bearer real' } })).status, 403);
      const favorite = await fetch(origin + '/me/favorite-meals/1', { method, headers: { Authorization: 'Bearer synthetic', Cookie: 'identity=real' } });
      assert.equal(favorite.status, 200); assert.equal((await favorite.json()).cookie, null);
    }
    assert.equal((await fetch(origin + '/me/favorite-meals', { headers: { Cookie: 'identity=real' } })).status, 403);
    assert.equal((await fetch(origin + '/me', { headers: { Cookie: 'identity=real' } })).status, 403);
    assert.equal((await fetch(origin + '/me', { headers: { Authorization: 'Bearer unavailable' } })).status, 503, 'backend failure must not masquerade as session expiry');
    assert.equal((await post('/auth/register', null)).status, 400);
    const allowed = await post('/auth/login?useCookies=true', { email: 'mobile-tunnel-test-iphone@example.test', password: 'synthetic' });
    assert.equal(allowed.status, 200);
    assert.ok(calls.includes('/auth/login?useCookies=false&useSessionCookies=false'));
    const profile = await fetch(origin + '/me', { headers: { Authorization: 'Bearer synthetic' } });
    assert.equal(profile.status, 200);
    const bundle = await fetch(origin + '/test.bundle', { headers: { Authorization: 'Bearer real', Cookie: 'identity=real' } });
    assert.deepEqual(await bundle.json(), { cookie: null, authorization: null });
    assert.equal((await fetch(origin + '/_expo/open', { method: 'POST' })).status, 404);
    const large = await post('/auth/register', { email: 'mobile-tunnel-test-iphone@example.test', password: 'x'.repeat(66000) });
    assert.equal(large.status, 413);
  } finally { await gateway.close(); await close(api); await close(metro); }
});

test('Metro websocket is usable; remote debugger websocket is blocked', async () => {
  const require = createRequire(new URL('../mobile/package.json', import.meta.url));
  const WebSocket = require('ws');
  const metro = createServer(); const ws = new WebSocket.Server({ server: metro });
  ws.on('connection', client => client.on('message', value => client.send(value)));
  const metroPort = await listen(metro);
  const gateway = createGateway({ apiPort: 1, metroPort, getOrigin: () => 'https://test-one.trycloudflare.com' });
  const port = await listen(gateway.server);
  const client = new WebSocket(`ws://127.0.0.1:${port}/hot`);
  try {
    await new Promise((r, reject) => { client.once('open', r); client.once('error', reject); });
    const echo = new Promise(r => client.once('message', value => r(value.toString())));
    client.send('synthetic-hmr'); assert.equal(await echo, 'synthetic-hmr');
    const blocked = new WebSocket(`ws://127.0.0.1:${port}/inspector/debug`);
    await new Promise(r => blocked.once('error', r));
  } finally { client.terminate(); await gateway.close(); for (const client of ws.clients) client.terminate(); ws.close(); await close(metro); }
});

test('occupied ports are reported and shutdown preserves unrelated processes', async () => {
  const server = createServer(); const port = await listen(server);
  try { await assert.rejects(assertPortFree(port), /Başka süreç kapatılmadı/); } finally { await close(server); }
  const child = () => spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { detached: true, stdio: 'ignore' });
  const ours = child(), other = child();
  try { await stopServices([ours]); assert.doesNotThrow(() => process.kill(other.pid, 0)); }
  finally { await stopServices([other]); }
});
