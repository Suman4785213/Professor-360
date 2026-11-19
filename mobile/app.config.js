module.exports = ({ config: base = require('./app.json').expo } = {}) => {
  const profile = process.env.P360_BUILD_PROFILE;
  if (profile && !['qa', 'local-qa', 'production'].includes(profile)) {
    throw new Error('P360_BUILD_PROFILE must be qa, local-qa or production');
  }
  const offline = process.env.EXPO_PUBLIC_QA_OFFLINE === '1';
  if (offline && profile !== 'qa') throw new Error('Offline configuration is QA-only');
  if (offline && process.env.EXPO_PUBLIC_API_BASE_URL) throw new Error('Offline QA must not embed an API URL');
  const localQa = profile === 'local-qa';
  const localApi = 'http://10.21.101.252:8000/api/v1/';
  if (localQa && process.env.EXPO_PUBLIC_API_BASE_URL !== localApi) {
    throw new Error('Local QA requires the explicitly authorized laptop API URL');
  }
  if (profile && !offline && !localQa) {
    let url;
    try { url = new URL(process.env.EXPO_PUBLIC_API_BASE_URL); }
    catch { throw new Error('Set the authorized HTTPS EXPO_PUBLIC_API_BASE_URL before building'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        url.pathname !== '/api/v1/' ||
        ['localhost', '127.0.0.1', '10.0.2.2', '[::1]'].includes(url.hostname) ||
        url.hostname.endsWith('.invalid')) {
      throw new Error('Release builds require an authorized, device-reachable HTTPS /api/v1/ endpoint');
    }
  }
  return {
    ...base,
    name: localQa ? 'Professor360 LOCAL QA' : base.name,
    extra: { ...base.extra, localQaApi: localQa ? localApi : null },
    android: {
      ...base.android,
      package: localQa ? 'com.professor360.mobile.localqa' : profile === 'qa' ? 'com.professor360.mobile.qa' : base.android.package,
      allowBackup: false,
      blockedPermissions: ['android.permission.SYSTEM_ALERT_WINDOW'],
    },
    plugins: [...base.plugins, './plugins/withReleaseSigning', ['./plugins/withNetworkPolicy', { localQa }]],
  };
};
