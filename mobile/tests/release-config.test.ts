/// <reference types="node" />
import { createRequire } from 'node:module';
import { afterEach, expect, it, vi } from 'vitest';
const config = createRequire(import.meta.url)('../app.config.js');
afterEach(() => vi.unstubAllEnvs());
it('permits an explicitly offline QA artifact without inventing a backend', () => {
  vi.stubEnv('P360_BUILD_PROFILE', 'qa');
  vi.stubEnv('EXPO_PUBLIC_QA_OFFLINE', '1');
  vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', '');
  expect(config().android.package).toBe('com.professor360.mobile.qa');
  vi.stubEnv('P360_BUILD_PROFILE', 'production');
  expect(() => config()).toThrow('QA-only');
});

it.each(['http://qa.example.org/api/v1/', 'https://localhost/api/v1/',
  'https://10.0.2.2/api/v1/', 'https://example.invalid/api/v1/',
  'https://user:password@qa.example.org/api/v1/', 'https://qa.example.org/api/v1/?token=x'])
('rejects unsafe release endpoint %s', (url) => {
  vi.stubEnv('P360_BUILD_PROFILE', 'production');
  vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', url);
  expect(() => config()).toThrow();
});
it('isolates QA package and protects backup/overlay settings without changing branding', () => {
  vi.stubEnv('P360_BUILD_PROFILE', 'qa');
  vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', 'https://qa.example.org/api/v1/');
  const result = config();
  expect(result.android.package).toBe('com.professor360.mobile.qa');
  expect(result.android.allowBackup).toBe(false);
  expect(result.android.blockedPermissions).toContain('android.permission.SYSTEM_ALERT_WINDOW');
  expect(result.name).toBe('Professor360');
});
