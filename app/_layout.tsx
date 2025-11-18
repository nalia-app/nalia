
import React, { useEffect, useRef } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import { updateRecurringEvents } from "@/utils/recurringEventsUtils";
import * as Notifications from 'expo-notifications';
import { 
  registerForPushNotificationsAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from '@/utils/pushNotifications';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "onboarding",
};

function RootLayoutNav() {
  const { user, isOnboarded, isLoading } = useUser();
  const segments = useSegments();
  const router = useRouter();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Update recurring events when app starts
  useEffect(() => {
    if (user && isOnboarded) {
      console.log('[RootLayout] Updating recurring events...');
      updateRecurringEvents();
    }
  }, [user, isOnboarded]);

  // Setup push notifications
  useEffect(() => {
    if (user && isOnboarded) {
      console.log('[RootLayout] Setting up push notifications...');
      
      // Register for push notifications
      registerForPushNotificationsAsync(user.id).then(token => {
        if (token) {
          console.log('[RootLayout] Push notifications registered successfully');
        }
      });

      // Handle notifications received while app is in foreground
      notificationListener.current = addNotificationReceivedListener(notification => {
        console.log('[RootLayout] Notification received:', notification);
      });

      // Handle notification tapped by user
      responseListener.current = addNotificationResponseReceivedListener(response => {
        console.log('[RootLayout] Notification tapped:', response);
        
        const data = response.notification.request.content.data;
        
        // Navigate based on notification type
        if (data.type === 'event_message' && data.event_id) {
          router.push(`/chat/${data.event_id}` as any);
        } else if (data.type === 'direct_message' && data.sender_id) {
          router.push(`/direct-message/${data.sender_id}` as any);
        } else if (data.type === 'event_reminder' && data.event_id) {
          router.push(`/event/${data.event_id}` as any);
        } else if (data.type === 'event_join' && data.event_id) {
          router.push(`/event/${data.event_id}` as any);
        } else if (data.type === 'event_join_request' && data.event_id) {
          router.push(`/event/${data.event_id}` as any);
        } else if (data.type === 'join_approved' && data.event_id) {
          router.push(`/event/${data.event_id}` as any);
        } else if (data.type === 'friend_request' && data.user_id) {
          router.push('/(tabs)/friends' as any);
        } else if (data.type === 'friend_accepted' && data.user_id) {
          router.push(`/user-profile/${data.user_id}` as any);
        }
      });

      return () => {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }
  }, [user, isOnboarded, router]);

  useEffect(() => {
    if (isLoading) {
      console.log('[RootLayout] Still loading user data...');
      return;
    }

    const inAuthGroup = segments[0] === 'onboarding';
    const inTabsGroup = segments[0] === '(tabs)';

    console.log('[RootLayout] Auth check:', { 
      user: user?.id, 
      isOnboarded, 
      inAuthGroup, 
      inTabsGroup,
      segments 
    });

    // If user is not logged in or not onboarded, redirect to onboarding
    if (!user || !isOnboarded) {
      if (!inAuthGroup) {
        console.log('[RootLayout] Redirecting to onboarding');
        router.replace('/onboarding/' as any);
      }
    } else {
      // User is logged in and onboarded
      if (inAuthGroup) {
        console.log('[RootLayout] Redirecting to home');
        router.replace('/(tabs)/(home)/' as any);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOnboarded, isLoading, segments]);

  return (
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
          gestureEnabled: false,
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
      <Stack.Screen
        name="people-nearby"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="direct-message/[id]"
        options={{
          presentation: "modal",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" animated />
      <UserProvider>
        <WidgetProvider>
          <RootLayoutNav />
          <SystemBars style="light" />
        </WidgetProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
