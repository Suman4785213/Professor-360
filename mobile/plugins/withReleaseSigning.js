const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

module.exports = function withReleaseSigning(config) {
  config = withGradleProperties(config, (mod) => {
    if (process.env.P360_BUILD_PROFILE) {
      mod.modResults = mod.modResults.filter((entry) => entry.key !== 'EX_DEV_CLIENT_NETWORK_INSPECTOR');
      mod.modResults.push({ type: 'property', key: 'EX_DEV_CLIENT_NETWORK_INSPECTOR', value: 'false' });
    }
    return mod;
  });
  return withAppBuildGradle(config, (mod) => {
    const marker = '// Professor360 private release signing';
    const existingBlock = mod.modResults.contents.indexOf(marker);
    if (existingBlock !== -1) mod.modResults.contents = mod.modResults.contents.slice(0, existingBlock);
    mod.modResults.contents += `
${marker}
def p360ReleaseRequested = gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') }
def p360Signing = ['P360_KEYSTORE_PATH', 'P360_KEYSTORE_PASSWORD', 'P360_KEY_ALIAS', 'P360_KEY_PASSWORD'].collectEntries { [(it): System.getenv(it)] }
if (p360ReleaseRequested && (p360Signing.values().any { !it } || !(System.getenv('P360_BUILD_PROFILE') in ['qa', 'local-qa', 'production']))) {
    throw new GradleException('Release requires P360_BUILD_PROFILE and private P360 signing environment variables. Debug signing is prohibited.')
}
android {
    // Hash long generated object paths before Ninja reaches Windows MAX_PATH.
    defaultConfig.externalNativeBuild.cmake.arguments '-DCMAKE_OBJECT_PATH_MAX=240'
    signingConfigs {
        p360Release {
            if (p360Signing.values().every { it }) {
                storeFile file(p360Signing['P360_KEYSTORE_PATH'])
                storePassword p360Signing['P360_KEYSTORE_PASSWORD']
                keyAlias p360Signing['P360_KEY_ALIAS']
                keyPassword p360Signing['P360_KEY_PASSWORD']
            }
        }
    }
    buildTypes.release.signingConfig = signingConfigs.p360Release
}
`;
    return mod;
  });
};
