
# iOS Build Troubleshooting Guide

## Issue
iOS build failing during archive phase with exit code 65 in Expo Launch.

## Root Causes Identified

1. **Malformed app.json** - The plugins array was not properly closed
2. **Build configuration issues** - Missing or incorrect EAS build settings
3. **Hermes configuration warnings** - Script phase warnings that may contribute to build failures
4. **Potential SDK version mismatches** - Build logs showing iPhoneOS26.0.sdk (non-existent)

## Solutions Implemented

### 1. Fixed Configuration Files

#### app.config.js (New)
- Converted `app.json` to `app.config.js` for better control and error handling
- Properly closed all configuration objects and arrays
- Added empty `googleMapsApiKey` to prevent build errors

#### eas.json Updates
- Added `"image": "latest"` to ensure latest build image is used
- Added `"resourceClass": "m-medium"` for better build resources
- Added CLI version specification for consistency

#### babel.config.js
- Fixed react-native-reanimated plugin reference (was using worklets, should be reanimated)
- Ensured reanimated plugin is last in the plugins array

### 2. Additional Configuration Files

#### .easignore
- Created to exclude unnecessary files from EAS builds
- Reduces build size and potential conflicts

#### .npmrc Updates
- Added peer dependency handling configurations
- Ensures better dependency resolution

#### expo-module.config.json
- Created for explicit native module configuration

### 3. Package.json Updates
- Added `overrides` field in addition to `resolutions` for better compatibility
- Added `build:ios` script for local testing

## Next Steps

1. **Clear EAS Build Cache**
   ```bash
   eas build --platform ios --clear-cache
   ```

2. **Verify Apple Developer Account Setup**
   - Ensure "Sign In with Apple" capability is enabled
   - Verify bundle identifier matches: `app.nalia`
   - Check provisioning profiles are valid

3. **Check Supabase Configuration**
   - Verify bundle ID is configured in Supabase dashboard
   - Ensure Apple Sign-In redirect URLs are set correctly

4. **Try a Clean Build**
   ```bash
   # Remove node_modules and reinstall
   rm -rf node_modules
   npm install
   
   # Run EAS build
   eas build --platform ios --profile production
   ```

5. **If Issues Persist**
   - Check the full build logs in EAS dashboard
   - Look for specific error messages before the "ARCHIVE FAILED" message
   - Verify all native dependencies are compatible with Expo 54
   - Consider temporarily removing `newArchEnabled: true` if using new architecture

## Common iOS Build Error Codes

- **Exit Code 65**: General build failure (signing, configuration, or compilation errors)
- **Exit Code 70**: Internal software error
- **Exit Code 1**: General error

## Debugging Commands

```bash
# Check EAS CLI version
eas --version

# View build logs
eas build:list

# View specific build details
eas build:view [BUILD_ID]

# Test prebuild locally (requires macOS)
npx expo prebuild --platform ios --clean
```

## Additional Resources

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [iOS Build Troubleshooting](https://docs.expo.dev/build-reference/ios-builds/)
- [Fastlane Codesigning Guide](https://docs.fastlane.tools/codesigning/getting-started/)

## Notes

- The warnings about Hermes and react-native-webview script phases are typically non-critical
- The actual error is likely earlier in the build log
- Check for any TypeScript compilation errors
- Verify all required assets (icons, splash screens) exist and are valid
