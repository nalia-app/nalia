
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { UserProvider } from "@/contexts/UserContext";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "onboarding",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  const [loaded, error] = useFonts({
    'SpaceMono-Regular': require("../assets/fonts/SpaceMono-Regular.ttf"),
    'SpaceMono-Bold': require("../assets/fonts/SpaceMono-Bold.ttf"),
    'SpaceMono-Italic': require("../assets/fonts/SpaceMono-Italic.ttf"),
    'SpaceMono-BoldItalic': require("../assets/fonts/SpaceMono-BoldItalic.ttf"),
    'PlayfairDisplay-Regular': require("@expo-google-fonts/playfair-display/fonts/PlayfairDisplay_400Regular.ttf"),
    'PlayfairDisplay-Italic': require("@expo-google-fonts/playfair-display/fonts/PlayfairDisplay_400Regular_Italic.ttf"),
    'PlayfairDisplay-Bold': require("@expo-google-fonts/playfair-display/fonts/PlayfairDisplay_700Bold.ttf"),
    'PlayfairDisplay-BoldItalic': require("@expo-google-fonts/playfair-display/fonts/PlayfairDisplay_700Bold_Italic.ttf"),
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

  const NaliaTheme: Theme = {
    dark: true,
    colors: {
      primary: '#BB86FC',
      background: '#121212',
      card: '#1E1E1E',
      text: '#FFFFFF',
      border: '#292929',
      notification: '#FF4081',
    },
  };

  return (
    <>
      <StatusBar style="light" animated />
      <ThemeProvider value={NaliaTheme}>
        <UserProvider>
          <WidgetProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
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
              </Stack>
              <SystemBars style="light" />
            </GestureHandlerRootView>
          </WidgetProvider>
        </UserProvider>
      </ThemeProvider>
    </>
  );
}
