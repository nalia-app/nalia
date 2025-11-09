
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { UserProvider } from "@/contexts/UserContext";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "onboarding",
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'SpaceMono-Regular': require("../assets/fonts/SpaceMono-Regular.ttf"),
    'SpaceMono-Bold': require("../assets/fonts/SpaceMono-Bold.ttf"),
    'SpaceMono-Italic': require("../assets/fonts/SpaceMono-Italic.ttf"),
    'SpaceMono-BoldItalic': require("../assets/fonts/SpaceMono-BoldItalic.ttf"),
    'PlayfairDisplay-Regular': PlayfairDisplay_400Regular,
    'PlayfairDisplay-Italic': PlayfairDisplay_400Regular_Italic,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    'PlayfairDisplay-BoldItalic': PlayfairDisplay_700Bold_Italic,
  });

  useEffect(() => {
    if (error) {
      console.error('Font loading error:', error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      console.log('All fonts loaded successfully');
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" animated />
      <UserProvider>
        <WidgetProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, animation: 'default' }}>
              <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding/welcome" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding/signup" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding/login" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding/interests" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding/profile-setup" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding/permissions" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="event-details"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="create-event"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="edit-profile"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="notifications"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="chat/[id]"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="user-profile/[id]"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="event/[id]"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
            </Stack>
            <SystemBars style="light" />
          </GestureHandlerRootView>
        </WidgetProvider>
      </UserProvider>
    </>
  );
}
