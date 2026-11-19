/// <reference types="node" />
import { createRequire } from 'node:module';
import { afterEach, expect, it, vi } from 'vitest';
import { validateApiBase } from '../src/services/apiPolicy';
const require = createRequire(import.meta.url);
const config = require('../app.config.js');
const { networkPolicy } = require('../plugins/withNetworkPolicy.js');
const url = 'http://10.21.101.252:8000/api/v1/';
afterEach(() => vi.unstubAllEnvs());

it('isolates local QA package, label and explicit runtime authorization', () => {
  vi.stubEnv('P360_BUILD_PROFILE', 'local-qa');
  vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', url);
  const result = config();
  expect(result.android.package).toBe('com.professor360.mobile.localqa');
  expect(result.name).toContain('LOCAL QA');
  expect(result.extra.localQaApi).toBe(url);
  vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', 'http://10.21.101.253:8000/api/v1/');
  expect(() => config()).toThrow();
});
it.each(['qa', 'production'])('keeps %s HTTPS-only and strips local authorization', (profile) => {
  vi.stubEnv('P360_BUILD_PROFILE', profile);
  vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', url);
  expect(() => config()).toThrow();
  vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', '');
  expect(() => config()).toThrow();
  vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', 'https://qa.example.org/api/v1/');
  expect(config({ config: { android: {}, plugins: [], extra: { localQaApi: url } } }).extra.localQaApi).toBeNull();
});
it('permits only the exact local runtime URL with explicit native config', () => {
  expect(() => validateApiBase(url, false, false, url)).not.toThrow();
  expect(() => validateApiBase(url, false, false, null)).toThrow();
  expect(() => validateApiBase(url.replace(':8000', ':9000'), false, false, url)).toThrow();
  expect(() => validateApiBase('', false, false, null)).toThrow();
});
it('limits Android cleartext to the laptop host and removes it from other builds', () => {
  expect(networkPolicy(true)).toContain('<base-config cleartextTrafficPermitted="false"');
  expect(networkPolicy(true)).toContain('<domain includeSubdomains="false">10.21.101.252</domain>');
  expect(networkPolicy(false)).not.toContain('cleartextTrafficPermitted="true"');
  expect(networkPolicy(false)).not.toContain('10.21.101.252');
});
