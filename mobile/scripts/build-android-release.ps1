param(
    [ValidateSet('qa', 'local-qa', 'production')][string]$Profile = 'qa',
    [switch]$OfflineQa,
    [switch]$AllowToolchainDownload
)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if ($OfflineQa -and $Profile -ne 'qa') { throw 'Offline artifacts are QA-only' }
foreach ($name in @('JAVA_HOME', 'ANDROID_HOME', 'P360_KEYSTORE_PATH', 'P360_KEYSTORE_PASSWORD', 'P360_KEY_ALIAS', 'P360_KEY_PASSWORD')) {
    if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Missing $name" }
}
if (-not (Test-Path -LiteralPath $env:P360_KEYSTORE_PATH -PathType Leaf)) { throw 'Signing keystore does not exist' }
$env:P360_BUILD_PROFILE = $Profile
$env:EXPO_NO_DOTENV = '1'
$env:CI = '1'
$env:EXPO_PUBLIC_QA_OFFLINE = if ($OfflineQa) { '1' } else { '0' }
if ($OfflineQa) { $env:EXPO_PUBLIC_API_BASE_URL = '' }
if ($Profile -eq 'local-qa') { $env:EXPO_PUBLIC_API_BASE_URL = 'http://10.21.101.252:8000/api/v1/' }
node -e "require('./app.config.js')()"
if ($LASTEXITCODE) { throw 'Invalid release configuration' }
$originalPackage = Get-Content package.json -Raw
try {
    # Windows PowerShell treats native stderr warnings as errors when redirected.
    $ErrorActionPreference = 'Continue'
    node node_modules/expo/bin/cli prebuild --platform android --no-install --skip-dependency-update react,react-native
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE) { throw 'Expo prebuild failed' }
} finally {
    $ErrorActionPreference = 'Stop'
    [IO.File]::WriteAllText((Join-Path $PWD 'package.json'), $originalPackage)
}
Push-Location android
try {
    $toolchainDownload = $AllowToolchainDownload.IsPresent.ToString().ToLowerInvariant()
    $gradleArguments = @(':app:assembleRelease', '--console=plain', "-Porg.gradle.java.installations.auto-download=$toolchainDownload")
    if ($env:P360_JAVA17_HOME) {
        if (-not (Test-Path -LiteralPath (Join-Path $env:P360_JAVA17_HOME 'bin\java.exe'))) { throw 'Invalid P360_JAVA17_HOME' }
        $gradleArguments += "-Porg.gradle.java.installations.paths=$env:P360_JAVA17_HOME"
    }
    $ErrorActionPreference = 'Continue'
    .\gradlew.bat @gradleArguments
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE) { throw 'Android release compilation failed' }
} finally { Pop-Location }
$apk = Join-Path $PWD 'android\app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path -LiteralPath $apk)) { throw 'Release APK was not generated' }
$apksigner = Join-Path $env:ANDROID_HOME 'build-tools\37.0.0\apksigner.bat'
& $apksigner verify --verbose --print-certs $apk
if ($LASTEXITCODE) { throw 'APK signature verification failed' }
$artifactDirectory = Join-Path $PWD 'release-artifacts'
New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
$variant = if ($OfflineQa) { 'qa-offline' } else { $Profile }
$artifact = Join-Path $artifactDirectory ("professor360-$variant-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.apk')
if (Test-Path -LiteralPath $artifact) { throw 'Refusing to overwrite an existing APK artifact' }
Copy-Item -LiteralPath $apk -Destination $artifact
if ((Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $artifact -Algorithm SHA256).Hash) { throw 'APK copy verification failed' }
Get-Item -LiteralPath $artifact | Select-Object FullName, Length
Get-FileHash -LiteralPath $artifact -Algorithm SHA256
