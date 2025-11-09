
# OAuth Setup Guide for Nalia

This guide will help you configure Google and Apple authentication for your Nalia app.

## Google Sign-In Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**

### 2. Create OAuth Client IDs

You need to create **three** OAuth client IDs:

#### A. Web Client ID (Required for both iOS and Android)
- Application type: **Web application**
- Authorized redirect URIs: Add your Supabase project URL
  - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Copy the **Client ID** - this is your `webClientId`

#### B. Android Client ID (For Android)
- Application type: **Android**
- Package name: Your app's package name (from `app.json`)
- SHA-1 certificate fingerprint:
  - For development: Run `keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey` (password: `android`)
  - For production: Use your release keystore SHA-1

#### C. iOS Client ID (For iOS)
- Application type: **iOS**
- Bundle ID: Your app's bundle identifier (from `app.json`)

### 3. Configure Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Google**
3. Enable Google provider
4. Add your **Web Client ID** (from step 2A)
5. Add the **Client Secret** from the Web Client ID
6. If you have multiple client IDs, add them all separated by commas (Web Client ID should be first)

### 4. Update Your App Code

In both `app/onboarding/signup.tsx` and `app/onboarding/login.tsx`, replace:

```typescript
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // Optional
  offlineAccess: false,
});
```

With your actual Client IDs from step 2.

---

## Apple Sign-In Setup

### 1. Apple Developer Account Setup

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** → Click **+** to create a new identifier

### 2. Configure App ID

1. Select **App IDs** → Continue
2. Select **App** → Continue
3. Enter a description and Bundle ID (must match your app's bundle ID)
4. Enable **Sign In with Apple** capability
5. Click **Continue** → **Register**

### 3. Create Service ID

1. Go back to **Identifiers** → Click **+**
2. Select **Services IDs** → Continue
3. Enter a description and identifier (e.g., `com.yourapp.auth`)
4. Enable **Sign In with Apple**
5. Click **Configure** next to Sign In with Apple
6. Select your App ID as the Primary App ID
7. Add your domain and return URLs:
   - Domains: `YOUR_PROJECT_REF.supabase.co`
   - Return URLs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
8. Save and Continue → Register

### 4. Create Key for Apple Sign In

1. Go to **Keys** → Click **+**
2. Enter a key name
3. Enable **Sign In with Apple**
4. Click **Configure** → Select your App ID
5. Save → Continue → Register
6. **Download the key file** (you can only download it once!)
7. Note the **Key ID**

### 5. Configure Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Apple**
3. Enable Apple provider
4. Enter your **Services ID** (from step 3)
5. Enter your **Team ID** (found in Apple Developer Portal under Membership)
6. Enter your **Key ID** (from step 4)
7. Upload or paste the contents of your **Private Key** file (from step 4)

### 6. Update app.json

Add the Apple Sign In capability to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourapp.nalia",
      "supportsTablet": true,
      "infoPlist": {
        "NSAppleEventsUsageDescription": "This app uses Apple Sign In for authentication"
      }
    },
    "plugins": [
      [
        "expo-apple-authentication",
        {
          "appleTeamId": "YOUR_TEAM_ID"
        }
      ]
    ]
  }
}
```

---

## Testing

### Google Sign-In Testing
- **Android**: Works on both emulator and physical devices
- **iOS**: Works on physical devices (simulator may have limitations)
- **Web**: Not applicable for native OAuth flow

### Apple Sign-In Testing
- **iOS only**: Requires iOS 13+ and a physical device or simulator with iOS 13+
- **Android**: Not available (the app will show a message)

---

## Troubleshooting

### Google Sign-In Issues

1. **"Developer Error" or "Error 10"**
   - Verify your SHA-1 certificate fingerprint is correct
   - Make sure you're using the correct keystore (debug vs release)
   - Check that the package name matches exactly

2. **"SIGN_IN_REQUIRED" or "12501"**
   - The Web Client ID is missing or incorrect
   - Make sure you're using the Web Client ID, not the Android Client ID

3. **"PLAY_SERVICES_NOT_AVAILABLE"**
   - Update Google Play Services on your device
   - Use a device/emulator with Google Play Services installed

### Apple Sign-In Issues

1. **"Not Available" message**
   - Apple Sign In only works on iOS 13+
   - Check that the capability is enabled in your App ID

2. **"Invalid Client" error**
   - Verify your Services ID is correct
   - Check that the return URL matches exactly
   - Ensure the domain is correctly configured

3. **Token validation errors**
   - Verify your Key ID and Team ID are correct
   - Check that the private key was uploaded correctly to Supabase

---

## Important Notes

- **Google**: The `webClientId` is **required** for both iOS and Android
- **Apple**: Only works on iOS devices, not on Android
- **Supabase**: Make sure both providers are enabled in your Supabase dashboard
- **Testing**: Test on physical devices for the most accurate results
- **Production**: Remember to create production OAuth credentials before releasing

---

## Additional Resources

- [Google Sign-In for React Native](https://github.com/react-native-google-signin/google-signin)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Setup](https://developer.apple.com/sign-in-with-apple/)
