
# iOS Build Troubleshooting Guide

## Latest Issue (Build 79+)
iOS build failing during archive phase with exit code 65 in Expo Launch.

## Error Details
```
$ set -o pipefail && xcodebuild -workspace ./nalia.xcworkspace -scheme nalia -configuration Release -destination 'generic/platform=iOS' -archivePath /Users/expo/Library/Developer/Xcode/Archives/2025-11-16/nalia\ 2025-11-16\ 13.26.09.xcarchive archive | tee /Users/expo/workingdir/logs/nalia-nalia.log > /dev/null
Run script build phase '[CP-User] [Hermes] Replace Hermes for the right configuration, if needed' will be run during every build because it does not specify any outputs.
▸ ** ARCHIVE FAILED **
▸ The following build commands failed:
▸ 	Archiving workspace nalia with scheme nalia
▸ (1 failure)
Exit status: 65
```

## Root Causes Identified

1. **Duplicate scheme configuration** - The `scheme` field was both inside and outside the `expo` object in app.json
2. **SDK version mismatch** - Build logs showing iPhoneOS26.0.sdk (non-existent SDK version)
3. **Build image compatibility** - Using "latest" image may pull incompatible Xcode versions
4. **Hermes configuration warnings** - Script phase warnings (typically non-critical but can contribute)

## Solutions Implemented

### 1. Fixed app.json Configuration

**Issues Fixed:**
- Removed duplicate `scheme` field outside the `expo` object
- Kept `scheme: "natively"` only inside the `expo` object
- Ensured all configuration is properly nested

**Key Configuration:**
```json
{
  "expo": {
    "scheme": "natively",
    "ios": {
      "bundleIdentifier": "app.nalia",
      "usesAppleSignIn": true,
      "buildNumber": "1"
    }
  }
}
```

### 2. Updated eas.json

**Changes Made:**
- Changed production build image from "latest" to "stable" for better compatibility
- Kept "latest" for development and preview builds
- Maintained `resourceClass: "m-medium"` for adequate build resources

**Rationale:**
- "stable" image uses a tested, stable version of Xcode
- "latest" can sometimes pull beta or incompatible versions
- This prevents SDK version mismatches

### 3. Verified babel.config.js

**Confirmed:**
- `react-native-reanimated/plugin` is last in plugins array (required)
- Module resolver is properly configured
- All presets and plugins are compatible with Expo 54

## Next Steps to Resolve

### Step 1: Clear Build Cache
```bash
eas build --platform ios --clear-cache --profile production
```

### Step 2: Verify Apple Developer Setup

**Critical Checklist:**
- [ ] Bundle ID `app.nalia` exists in Apple Developer Console
- [ ] "Sign in with Apple" capability is enabled for the bundle ID
- [ ] Provisioning profile is valid and not expired
- [ ] Certificate is valid and not expired
- [ ] App ID configuration is saved

**How to Check:**
1. Go to [Apple Developer Console](https://developer.apple.com/account/resources/identifiers/list/bundleId)
2. Find `app.nalia` in the list
3. Click on it and verify "Sign in with Apple" is checked
4. Click "Save" even if no changes were made (this refreshes the configuration)

### Step 3: Verify Supabase Configuration

**Required Settings:**
- [ ] Apple provider is enabled in Supabase Auth
- [ ] Bundle ID `app.nalia` is in "Authorized Client IDs"
- [ ] Redirect URLs include:
  - `natively://`
  - `https://natively.dev/email-confirmed`

### Step 4: Run Clean Build

```bash
# Option 1: Using EAS (Recommended)
eas build --platform ios --profile production --clear-cache

# Option 2: Local prebuild (requires macOS with Xcode)
npx expo prebuild --platform ios --clean
```

### Step 5: Monitor Build Logs

When the build runs, watch for:
1. **Early errors** - The actual error is often before "ARCHIVE FAILED"
2. **Code signing issues** - Look for "provisioning profile" or "certificate" errors
3. **Compilation errors** - TypeScript or native code compilation failures
4. **Missing assets** - Icon or splash screen issues

## Common iOS Build Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 65 | General build failure | Code signing, configuration, compilation errors |
| 70 | Internal software error | Xcode or build tool issues |
| 1 | General error | Various causes, check logs |

## Debugging Steps

### 1. Check Full Build Logs
```bash
# List recent builds
eas build:list --platform ios

# View specific build
eas build:view [BUILD_ID]
```

### 2. Look for Specific Errors

Search the logs for:
- `error:` - Compilation or configuration errors
- `Code Sign error` - Signing issues
- `No profile for team` - Provisioning profile issues
- `asset not found` - Missing files

### 3. Verify Dependencies

```bash
# Check for outdated packages
npm outdated

# Verify peer dependencies
npm ls
```

### 4. Test Locally (macOS only)

```bash
# Clean prebuild
npx expo prebuild --platform ios --clean

# Open in Xcode
open ios/nalia.xcworkspace

# Try to archive in Xcode to see detailed errors
```

## Additional Troubleshooting

### If Build Still Fails

1. **Temporarily disable new architecture:**
   - Remove `"newArchEnabled": true` from app.json
   - This can help identify if the issue is related to the new architecture

2. **Check for conflicting dependencies:**
   - Review package.json for any beta or alpha versions
   - Ensure all Expo packages are compatible with Expo 54

3. **Verify all required assets exist:**
   ```bash
   # Check if icon exists
   ls -la assets/images/natively-dark.png
   
   # Check if splash screen exists
   ls -la assets/images/natively-dark.png
   ```

4. **Review Apple Developer Account status:**
   - Ensure your Apple Developer membership is active
   - Check if any agreements need to be accepted
   - Verify payment information is up to date

### Known Issues

1. **Hermes Warning:** The warning about Hermes script phase is typically non-critical and doesn't cause build failures
2. **react-native-webview:** May show warnings but shouldn't cause failures
3. **Google Sign-In:** Ensure `@react-native-google-signin/google-signin` is properly configured

## Success Indicators

✅ Build is successful when:
- Archive completes without errors
- IPA file is generated
- Build appears in EAS dashboard with "Finished" status
- You can download and install the build on a device

## Resources

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [iOS Build Troubleshooting](https://docs.expo.dev/build-reference/ios-builds/)
- [Fastlane Codesigning Guide](https://docs.fastlane.tools/codesigning/getting-started/)
- [Apple Developer Console](https://developer.apple.com/account/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

## Recent Changes Log

### Build 79+ (Current)
- Fixed duplicate `scheme` configuration in app.json
- Changed production build image to "stable" in eas.json
- Removed `newArchEnabled` temporarily for compatibility testing
- Verified babel.config.js configuration

### Build 78
- Converted from app.config.js to app.json
- Fixed configuration structure issues
- Added proper plugin configuration

### Build 77 and earlier
- Various dependency and configuration fixes
- Removed react-native-maps dependency
- Fixed code signing issues

---

**Last Updated:** 2025-11-16
**Status:** Configuration fixed, ready for next build attempt
