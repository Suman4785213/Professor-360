export function validateApiBase(base: string, offline: boolean, development: boolean, localQaApi: unknown) {
  if (offline) return;
  if (!base.endsWith('/api/v1/')) throw new Error('API URL must end with /api/v1/');
  const localAllowed = localQaApi === 'http://10.21.101.252:8000/api/v1/' && base === localQaApi;
  if (!development && !base.startsWith('https://') && !localAllowed)
    throw new Error('Production API requires HTTPS');
}
