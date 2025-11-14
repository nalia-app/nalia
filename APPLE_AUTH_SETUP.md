
# Apple Authentication Setup Guide for Nalia

This guide will help you complete the Apple Sign In setup for your Nalia app.

## ✅ What's Already Done

1. ✅ Bundle ID `app.nalia` configured in Supabase
2. ✅ `expo-apple-authentication` package installed
3. ✅ Apple Sign In code implemented in signup.tsx and login.tsx
4. ✅ app.json updated with proper bundle identifier and Apple Sign In capability

## 🔧 What You Need to Do

### 1. Apple Developer Console Setup

#### Step 1: Create/Configure App ID
1. Go to [Apple Developer Console - Identifiers](https://developer.apple.com/account/resources/identifiers/list/bundleId)
2. Create a new App ID or find your existing one with identifier: `app.nalia`
3. In the Capabilities section, enable **Sign in with Apple**
4. Save your changes

#### Step 2: Register Bundle ID in Supabase Dashboard
1. Go to your [Supabase Dashboard - Authentication - Providers - Apple](https://supabase.com/dashboard/project/_/auth/providers)
2. Under **"Authorized Client IDs"** section, add: `app.nalia`
3. Click **Save**

**Important:** If you're testing with Expo Go during development, also add `host.exp.Exponent` to the Client IDs list.

### 2. Deep Linking Configuration (Already Done)

✅ The deep linking is already configured in app.json:
- Scheme: `natively`
- This allows Apple to redirect back to your app after authentication

### 3. Supabase Redirect URL Configuration

1. Go to [Supabase Dashboard - Authentication - URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration)
2. Add the following to **"Redirect URLs"**:
   - `natively://` (for production app)
   - `exp://` (if testing with Expo Go)
   - `https://natively.dev/email-confirmed` (for email verification)

### 4. Build and Test

#### For Development (Expo Go):
```bash
# Start the development server
npx expo start
```

**Note:** Apple Sign In will NOT work in Expo Go on iOS. You need to create a development build.

#### For Development Build:
```bash
# Clean and rebuild
npx expo prebuild --clean

# Run on iOS device (Apple Sign In requires a real device, not simulator)
npx expo run:ios --device
```

#### For Production:
```bash
# Build for iOS
eas build --platform ios
```

### 5. Testing Checklist

Test the following scenarios:

- [ ] Sign up with Apple on iOS device
- [ ] Sign in with Apple on iOS device (returning user)
- [ ] Verify user profile is created in Supabase
- [ ] Verify user is redirected to interests page (new user)
- [ ] Verify user is redirected to home page (existing user)
- [ ] Test canceling the Apple Sign In flow
- [ ] Verify error messages are displayed correctly

## 🔍 Troubleshooting

### Issue: "Apple Sign In is only available on iOS 13+"
**Solution:** This is expected on Android or older iOS versions. Apple Sign In only works on iOS 13+.

### Issue: "No identity token received from Apple"
**Solution:** 
1. Verify `app.nalia` is added to Supabase Client IDs
2. Verify Sign in with Apple is enabled in Apple Developer Console for your App ID
3. Check that you're testing on a real iOS device (not simulator)

### Issue: App doesn't redirect back after Apple authentication
**Solution:**
1. Verify the scheme `natively` is configured in app.json
2. Verify redirect URLs are added in Supabase dashboard
3. Run `npx expo prebuild --clean` to regenerate native files

### Issue: "ERR_REQUEST_CANCELED"
**Solution:** This means the user canceled the sign-in flow. This is normal behavior.

## 📱 Platform Support

| Platform | Apple Sign In Support | Notes |
|----------|----------------------|-------|
| iOS 13+ | ✅ Full Support | Requires real device for testing |
| Android | ❌ Not Available | Show appropriate message to users |
| Web | ❌ Not Available | Would require additional OAuth setup |

## 🔐 Security Notes

1. **Never commit** your Apple private keys to version control
2. The identity token is securely handled by Supabase Auth
3. User email and name are only shared on first sign-in (Apple privacy feature)
4. Always test the full authentication flow before releasing to production

## 📚 Additional Resources

- [Supabase Apple Auth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Expo Apple Authentication Documentation](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Apple Sign In Guidelines](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)

## ✨ Next Steps

After completing the setup:

1. Test thoroughly on a real iOS device
2. Submit your app for App Store review
3. Monitor authentication logs in Supabase dashboard
4. Consider adding analytics to track sign-in success rates

---

**Need Help?** Check the Supabase logs in your dashboard under Authentication > Logs for detailed error messages.
