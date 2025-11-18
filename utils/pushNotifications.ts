
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and save token to database
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  try {
    // Check if running on physical device
    if (!Device.isDevice) {
      console.log('[PushNotifications] Must use physical device for push notifications');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted');
      return null;
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // This will be auto-detected in Expo Go
    });
    
    const token = tokenData.data;
    console.log('[PushNotifications] Got push token:', token);

    // Save token to database
    const deviceName = `${Device.brand} ${Device.modelName}`;
    
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token: token,
        device_name: deviceName,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token',
      });

    if (error) {
      console.error('[PushNotifications] Error saving token:', error);
      return null;
    }

    console.log('[PushNotifications] Token saved successfully');
    return token;
  } catch (error) {
    console.error('[PushNotifications] Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Remove push token from database (e.g., on logout)
 */
export async function unregisterPushNotifications(userId: string, token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      console.error('[PushNotifications] Error removing token:', error);
    } else {
      console.log('[PushNotifications] Token removed successfully');
    }
  } catch (error) {
    console.error('[PushNotifications] Error unregistering push notifications:', error);
  }
}

/**
 * Handle notification received while app is in foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Handle notification tapped by user
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get badge count
 */
export async function getBadgeCountAsync(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCountAsync(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function dismissAllNotificationsAsync(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
