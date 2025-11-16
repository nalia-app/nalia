
module.exports = {
  name: "nalia",
  slug: "nalia",
  owner: "max1818",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/natively-dark.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  scheme: "natively",
  splash: {
    image: "./assets/images/natively-dark.png",
    resizeMode: "contain",
    backgroundColor: "#000000"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "app.nalia",
    usesAppleSignIn: true,
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription: "Nalia needs your location to show nearby events and meetups.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "Nalia needs your location to show nearby events and meetups.",
      NSLocationAlwaysUsageDescription: "Nalia needs your location to show nearby events and meetups.",
      NSCameraUsageDescription: "Nalia needs access to your camera to take profile photos.",
      NSPhotoLibraryUsageDescription: "Nalia needs access to your photo library to select profile photos.",
      NSUserTrackingUsageDescription: "This identifier will be used to deliver personalized ads to you.",
      CFBundleURLTypes: [
        {
          CFBundleTypeRole: "Editor",
          CFBundleURLSchemes: ["natively"]
        }
      ]
    },
    config: {
      googleMapsApiKey: ""
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/natively-dark.png",
      backgroundColor: "#000000"
    },
    edgeToEdgeEnabled: true,
    package: "app.nalia",
    softwareKeyboardLayoutMode: "pan",
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE"
    ]
  },
  web: {
    favicon: "./assets/images/final_quest_240x240.png",
    bundler: "metro"
  },
  plugins: [
    "expo-router",
    "expo-web-browser",
    "expo-apple-authentication",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Nalia needs your location to show nearby events and meetups.",
        locationAlwaysPermission: "Nalia needs your location to show nearby events and meetups.",
        locationWhenInUsePermission: "Nalia needs your location to show nearby events and meetups."
      }
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Nalia needs access to your photo library to select profile photos.",
        cameraPermission: "Nalia needs access to your camera to take profile photos."
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    router: {},
    eas: {
      projectId: "3efa968a-7b2e-4365-ba9b-75bd5ed3b974"
    }
  }
};
