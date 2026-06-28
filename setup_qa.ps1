param (
    [Parameter(Mandatory=$true)]
    [string]$AppFolder
)

$AppPath = "d:\Projectos\Nhiquela\$AppFolder"
Write-Host "Configuring QA for $AppFolder..."

Set-Location $AppPath

# Install dependencies
Write-Host "Installing QA dependencies in $AppFolder..."
npm install -D eslint prettier husky lint-staged jest @testing-library/react-native @testing-library/jest-native react-test-renderer eslint-config-prettier eslint-plugin-prettier babel-jest --legacy-peer-deps

# Create ESLint Config
$eslintConfig = @"
module.exports = {
  root: true,
  extends: ['universe/native', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'warn',
    'no-unused-vars': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  }
};
"@
Set-Content -Path ".\.eslintrc.js" -Value $eslintConfig

# Create Prettier Config
$prettierConfig = @"
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
"@
Set-Content -Path ".\.prettierrc" -Value $prettierConfig

# Create Jest Config
$jestConfig = @"
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect']
};
"@
Set-Content -Path ".\jest.config.js" -Value $jestConfig

# Update package.json scripts
$packageJson = Get-Content -Path ".\package.json" | ConvertFrom-Json
if (-not $packageJson.scripts) {
    $packageJson | Add-Member -MemberType NoteProperty -Name "scripts" -Value @{}
}

$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "lint" -Value "eslint ." -Force
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "lint:fix" -Value "eslint . --fix" -Force
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "test" -Value "jest" -Force
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "security-check" -Value "npm audit --audit-level=critical" -Force
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "eas-build-pre-install" -Value "npm run security-check" -Force
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "eas-build-pre-build" -Value "npm run lint && npm run test" -Force

# Lint Staged Config
$lintStaged = @{
    "*.{js,jsx,ts,tsx}" = @(
        "eslint --fix",
        "prettier --write"
    )
}
$packageJson | Add-Member -MemberType NoteProperty -Name "lint-staged" -Value $lintStaged -Force

$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path ".\package.json"

Write-Host "Completed setup for $AppFolder."
