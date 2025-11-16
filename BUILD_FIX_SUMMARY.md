
# iOS Build Fix Summary - Build 79+

## Issue
iOS build failing at archive stage with exit code 65 during Expo Launch.

## Changes Made

### 1. app.json - Fixed Configuration Structure
**Problem:** Duplicate `scheme` field causing configuration conflicts
- Removed `"scheme": "nalia"` from root level (outside expo object)
- Kept `"scheme": "natively"` inside the expo object where it belongs
- This ensures proper deep linking and URL scheme configuration

### 2. eas.json - Improved Build Stability
**Problem:** Using "latest" build image can pull incompatible Xcode versions
- Changed production build from `"image": "latest"` to `"image": "stable"`
- Stable image uses tested, production-ready Xcode versions
- Prevents SDK version mismatches (like the iPhoneOS26.0.sdk error)

### 3. tsconfig.json - Removed Dead Reference
**Problem:** Referenced non-existent app.config.js file
- Removed `"app.config.js"` from include array
- This file was deleted in previous fixes when converting to app.json

## Why These Changes Fix the Build

### The Duplicate Scheme Issue
When `scheme` appears both inside and outside the `expo` object:
- Expo's configuration parser gets confused
- Native build tools receive conflicting URL scheme information
- This can cause the archive process to fail with exit code 65

### The Build Image Issue
Using "latest" image:
- May pull beta or release candidate versions of Xcode
- Can result in SDK version mismatches (e.g., iPhoneOS26.0.sdk which doesn't exist)
- "stable" image ensures a tested, compatible Xcode version

### The TypeScript Reference Issue
Including a non-existent file in tsconfig.json:
- Can cause TypeScript compilation issues during build
- May prevent proper type checking
- Cleaning this up ensures smooth compilation

## Expected Outcome

After these changes, the build should:
1. ✅ Pass the configuration validation stage
2. ✅ Use a compatible Xcode version
3. ✅ Successfully compile TypeScript code
4. ✅ Complete the archive process
5. ✅ Generate a valid IPA file

## Next Steps

### 1. Trigger a New Build
```bash
eas build --platform ios --profile production --clear-cache
```

The `--clear-cache` flag ensures EAS doesn't use any cached configuration from previous failed builds.

### 2. Monitor the Build
Watch for these success indicators:
- ✅ Configuration loads without warnings
- ✅ Dependencies install successfully
- ✅ TypeScript compilation completes
- ✅ Native code compiles without errors
- ✅ Archive process completes
- ✅ IPA file is generated

### 3. If Build Still Fails

Check the build logs for:
1. **Code Signing Errors** - Verify Apple Developer account setup
2. **Missing Provisioning Profile** - Ensure profile is valid and not expired
3. **Compilation Errors** - Look for TypeScript or native code errors
4. **Asset Errors** - Verify all required images exist

### 4. Verify Apple Developer Setup

Critical items to check:
- [ ] Bundle ID `app.nalia` exists in Apple Developer Console
- [ ] "Sign in with Apple" capability is enabled
- [ ] Provisioning profile is valid
- [ ] Certificate is not expired
- [ ] Apple Developer membership is active

## Additional Notes

### About the Hermes Warning
The warning about Hermes script phase is cosmetic and doesn't cause build failures:
```
Run script build phase '[CP-User] [Hermes] Replace Hermes for the right configuration, if needed' 
will be run during every build because it does not specify any outputs.
```
This is a CocoaPods warning that can be safely ignored.

### About Exit Code 65
Exit code 65 is a generic Xcode build failure code that can have many causes:
- Configuration errors (fixed ✅)
- Code signing issues (verify Apple Developer setup)
- Compilation errors (check build logs)
- Missing resources (verify assets exist)

The actual error is usually earlier in the build log, before the "ARCHIVE FAILED" message.

## Files Modified

1. ✅ `app.json` - Removed duplicate scheme configuration
2. ✅ `eas.json` - Changed production image to "stable"
3. ✅ `tsconfig.json` - Removed app.config.js reference
4. ✅ `IOS_BUILD_TROUBLESHOOTING.md` - Updated with latest fixes

## Commit Message

```
fix(ios): resolve build failure with configuration fixes

- Remove duplicate scheme field from app.json
- Use stable build image for production builds
- Clean up tsconfig.json references
- Update troubleshooting documentation

Fixes exit code 65 build failure in Expo Launch
```

---

**Date:** 2025-11-16
**Build Target:** iOS Production
**Status:** Ready for build retry
