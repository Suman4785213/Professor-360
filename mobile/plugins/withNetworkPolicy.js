const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const networkPolicy = (localQa) => `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
${localQa ? '  <domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">10.21.101.252</domain></domain-config>' : ''}
</network-security-config>
`;

module.exports = function withNetworkPolicy(config, { localQa = false } = {}) {
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0].$;
    app['android:networkSecurityConfig'] = '@xml/p360_network_security';
    app['android:usesCleartextTraffic'] = 'false';
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const dir = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'p360_network_security.xml'), networkPolicy(localQa));
    return mod;
  }]);
};
module.exports.networkPolicy = networkPolicy;
