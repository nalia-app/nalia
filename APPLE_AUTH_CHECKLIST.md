
# Apple Authentication Quick Checklist ✓

## Pre-Flight Checklist

Before testing Apple Sign In, ensure all these items are completed:

### Apple Developer Console
- [ ] App ID `app.nalia` exists in [Apple Developer Console](https://developer.apple.com/account/resources/identifiers/list/bundleId)
- [ ] "Sign in with Apple" capability is enabled for the App ID
- [ ] App ID is saved with the capability enabled

### Supabase Dashboard
- [ ] Apple provider is enabled in [Auth Providers](https://supabase.com/dashboard/project/_/auth/providers)
- [ ] Bundle ID `app.nalia` is added to "Authorized Client IDs"
- [ ] (Optional) `host.exp.Exponent` is added for Expo Go testing
- [ ] Redirect URLs are configured:
  - [ ] `natively://`
  - [ ] `exp://` (for Expo Go)
  - [ ] `https://natively.dev/email-confirmed`

### App Configuration
- [ ] `app.json` has `bundleIdentifier: "app.nalia"` for iOS
- [ ] `app.json` has `usesAppleSignIn: true` for iOS
- [ ] `app.json` has `expo-apple-authentication` in plugins
- [ ] Deep linking scheme `natively` is configured

### Code Implementation
- [ ] `expo-apple-authentication` package is installed
- [ ] Apple Sign In button is visible on signup page (iOS only)
- [ ] Apple Sign In button is visible on login page (iOS only)
- [ ] Error handling is implemented
- [ ] Profile creation logic is in place

### Testing Environment
- [ ] Testing on a real iOS device (not simulator)
- [ ] iOS version is 13 or higher
- [ ] Development build is created (not using Expo Go)
- [ ] Device is signed in to iCloud

## Build Commands

```bash
# Clean rebuild (run this after any app.json changes)
npx expo prebuild --clean

# Run on iOS device
npx expo run:ios --device

# Or build with EAS
eas build --platform ios --profile development
```

## Quick Test

1. Open the app on your iOS device
2. Navigate to Sign Up or Log In screen
3. Tap "Continue with Apple"
4. Complete Apple authentication
5. Verify you're redirected to the app
6. Check Supabase dashboard to confirm user was created

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Button not showing | Check Platform.OS === 'ios' and iOS version >= 13 |
| "Not Available" error | Verify bundle ID in Supabase matches app.json |
| No redirect after auth | Run `npx expo prebuild --clean` |
| Simulator not working | Use a real device - Apple Sign In doesn't work in simulator |

## Success Indicators

✅ You'll know it's working when:
- Apple Sign In button appears on iOS
- Tapping it opens Apple's authentication sheet
- After authentication, you're redirected back to the app
- User appears in Supabase Auth dashboard
- Profile is created in profiles table
- User is navigated to interests page (new) or home (existing)

---

**Status:** Ready to test once Apple Developer Console setup is complete!
