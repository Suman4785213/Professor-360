import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function setup() {
  let handler, resolveRefresh, rejectRefresh, refreshCalls = 0;
  const values = new Map([['access_token', 'old-access'], ['refresh_token', 'old-refresh']]);
  const localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) };
  const retries = [];
  const client = config => { retries.push(config); return Promise.resolve({ status: 200 }); };
  client.interceptors = { request: { use() {} }, response: { use(ok, fail) { handler = fail; } } };
  const axios = { create: () => client, post: () => {
    refreshCalls++;
    return new Promise((resolve, reject) => { resolveRefresh = resolve; rejectRefresh = reject; });
  } };
  let source = fs.readFileSync(new URL('../src/api/client.ts', import.meta.url), 'utf8')
    .replace("import axios from 'axios';", '')
    .replace('import.meta.env.VITE_API_BASE_URL', 'undefined').replaceAll('export ', '');
  const context = { axios, localStorage, window: { location: { href: '' } } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { context, values, retries, calls: () => refreshCalls,
    success: () => resolveRefresh({ data: { access: 'new-access', refresh: 'new-refresh' } }),
    failure: () => rejectRefresh(new Error('failed')),
    request: () => handler({ response: { status: 401 }, config: { url: '/activities/', headers: { Authorization: 'Bearer old-access' } } }) };
}

test('concurrent 401s use one refresh and persist both tokens', async () => {
  const s = setup(); const a = s.request(), b = s.request();
  assert.equal(s.calls(), 1); s.success(); await Promise.all([a,b]);
  assert.equal(s.values.get('access_token'), 'new-access');
  assert.equal(s.values.get('refresh_token'), 'new-refresh');
  assert.equal(s.retries.length, 2);
  await s.request(); // Delayed old-token 401 reuses the refreshed access token.
  assert.equal(s.calls(), 1);
});

test('failed refresh clears current session', async () => {
  const s=setup(); const p=s.request(); s.failure(); await assert.rejects(p);
  assert.equal(s.values.size,0); assert.equal(s.context.window.location.href,'/');
});

test('logout during refresh cannot resurrect session', async () => {
  const s=setup(); const p=s.request(); s.values.clear(); s.success(); await assert.rejects(p);
  assert.equal(s.values.size,0); assert.equal(s.retries.length,0);
});

test('failed old refresh does not clear a new account session', async () => {
  const s=setup(); const p=s.request(); s.values.set('access_token','other-access');
  s.values.set('refresh_token','other-refresh'); s.failure(); await assert.rejects(p);
  assert.equal(s.values.get('refresh_token'),'other-refresh');
});
