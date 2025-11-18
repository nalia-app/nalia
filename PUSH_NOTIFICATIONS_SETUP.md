
# Push Notifications Setup for Nalia

This document explains how push notifications are implemented in the Nalia app.

## ✅ Implementation Status

**All push notification features are fully implemented and operational!**

The following notification scenarios are now active:

1. ✅ **New friend request** - When someone sends you a friend request
2. ✅ **Friend request approved** - When someone accepts your friend request
3. ✅ **New event messages** - When someone sends a message in an event chat you're part of
4. ✅ **New direct messages** - When someone sends you a direct message
5. ✅ **Event reminders** - 1 hour before an event starts (for hosts and attendees)
6. ✅ **Someone joined your event** - When someone joins an event you're hosting (public events)
7. ✅ **Join request for private events** - When someone requests to join your private event
8. ✅ **Join request approved** - When your request to join a private event is approved
9. ✅ **Event canceled/deleted** - When an event you're attending is deleted/canceled

## Architecture

### Database Tables

- **`push_tokens`** - Stores Expo push notification tokens for each user
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `token` (text) - Expo push token
  - `device_name` (text) - Device identifier
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

- **`push_notification_queue`** - Queue for notifications to be sent (processed by edge function)
  - `id` (uuid, primary key)
  - `user_ids` (uuid[]) - Array of user IDs to send to
  - `title` (text) - Notification title
  - `body` (text) - Notification body
  - `data` (jsonb) - Additional data for navigation
  - `created_at` (timestamptz)
  - `processed` (boolean) - Whether notification has been sent
  - `processed_at` (timestamptz)

### Edge Functions

1. **`send-push-notification`** - Sends push notifications via Expo's Push API
   - Accepts: `user_ids`, `title`, `body`, `data`
   - Fetches push tokens for users
   - Sends notifications to Expo Push API
   - Returns: success status and count of notifications sent

2. **`process-notification-queue`** - Processes queued notifications
   - Runs every minute via cron job
   - Fetches unprocessed notifications from queue
   - Calls `send-push-notification` for each item
   - Marks notifications as processed

3. **`send-event-reminders`** - Checks for upcoming events and sends reminders
   - Runs every 10 minutes via cron job
   - Finds events starting in approximately 1 hour
   - Sends reminders to all approved attendees (including host)
   - Uses notification queue for delivery

### Database Triggers & Functions

All triggers automatically queue notifications when relevant events occur:

#### Friend Request Notifications

- **`notify_friend_request()`** - Triggered on INSERT to `friendships`
  - Sends notification to friend when request is created
  - Only triggers for 'pending' status

- **`notify_friend_request_approved()`** - Triggered on UPDATE to `friendships`
  - Sends notification to requester when request is accepted
  - Only triggers when status changes from 'pending' to 'accepted'

#### Event Message Notifications

- **`notify_new_event_message()`** - Triggered on INSERT to `messages`
  - Sends notification to all approved attendees except sender
  - Includes event description and message preview

#### Direct Message Notifications

- **`notify_new_direct_message()`** - Triggered on INSERT to `direct_messages`
  - Sends notification to receiver
  - Includes sender name and message preview

#### Event Attendee Notifications

- **`notify_event_join()`** - Triggered on INSERT to `event_attendees`
  - For public events: Notifies host when someone joins (status='approved')
  - For private events: Notifies host when someone requests to join (status='pending')

- **`notify_join_request_approved()`** - Triggered on UPDATE to `event_attendees`
  - Sends notification to user when their join request is approved
  - Only triggers when status changes from 'pending' to 'approved'

#### Event Deletion Notifications

- **`notify_event_deleted()`** - Triggered on DELETE from `events`
  - Sends notification to all approved attendees (except host)
  - Notifies them that the event has been canceled

#### Helper Function

- **`queue_push_notification(p_user_ids, p_title, p_body, p_data)`**
  - Inserts notification into `push_notification_queue` table
  - Called by all trigger functions
  - Ensures notifications are processed asynchronously

### Cron Jobs (Automated Scheduling)

Two cron jobs are configured using `pg_cron` extension:

1. **Process Notification Queue** - Runs every minute
   ```sql
   Schedule: * * * * *
   Action: Calls process-notification-queue edge function
   ```

2. **Send Event Reminders** - Runs every 10 minutes
   ```sql
   Schedule: */10 * * * *
   Action: Calls send-event-reminders edge function
   ```

To view cron job status:
```sql
-- View all cron jobs
SELECT jobid, jobname, schedule, active FROM cron.job;

-- View recent cron job runs
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

## Client-Side Implementation

### Registration

Push notifications are registered in two places:

1. **Onboarding** - `app/onboarding/permissions.tsx`
   - Users are prompted to enable notifications during onboarding
   - Token is saved to database when permission is granted
   - Uses `registerForPushNotificationsAsync()` utility function

2. **App Launch** - `app/_layout.tsx`
   - Automatically registers for push notifications when user logs in
   - Sets up notification handlers for foreground and tap events
   - Handles navigation based on notification type

### Settings

Users can manage push notifications in `app/settings.tsx`:
- Toggle to enable/disable push notifications
- Re-register for notifications if needed
- Shows current notification permission status

### Notification Handling

When a user taps a notification, the app automatically navigates to the relevant screen based on the notification type:

- `event_message` → Event chat (`/chat/[event_id]`)
- `direct_message` → Direct message chat (`/direct-message/[sender_id]`)
- `event_reminder` → Event details (`/event/[event_id]`)
- `event_join` → Event details (`/event/[event_id]`)
- `event_join_request` → Event details (`/event/[event_id]`)
- `join_approved` → Event details (`/event/[event_id]`)
- `friend_request` → Friends tab (`/(tabs)/friends`)
- `friend_accepted` → User profile (`/user-profile/[user_id]`)
- `event_canceled` → (Notification only, no navigation)

### Utility Functions

Located in `utils/pushNotifications.ts`:

- `registerForPushNotificationsAsync(userId)` - Register device for push notifications
- `unregisterPushNotifications(userId, token)` - Remove push token from database
- `addNotificationReceivedListener(callback)` - Handle foreground notifications
- `addNotificationResponseReceivedListener(callback)` - Handle notification taps
- `getBadgeCountAsync()` - Get app badge count
- `setBadgeCountAsync(count)` - Set app badge count
- `dismissAllNotificationsAsync()` - Clear all notifications

## Testing

To test push notifications:

1. **Physical Device Required** - Push notifications only work on physical devices, not simulators/emulators

2. **Enable Notifications** - Make sure to enable notifications in the app's permissions screen during onboarding or in settings

3. **Trigger Events** - Perform actions that should trigger notifications:
   - Send a friend request
   - Accept a friend request
   - Send a message in an event chat
   - Send a direct message
   - Join a public event (as non-host)
   - Request to join a private event
   - Approve a join request
   - Create an event starting in ~1 hour (wait for reminder)
   - Delete an event with attendees

4. **Check Logs** - Monitor the edge function logs in Supabase dashboard:
   - Go to Edge Functions → Select function → Logs
   - Check for errors or successful sends

5. **Verify Queue** - Check if notifications are being queued:
   ```sql
   SELECT * FROM push_notification_queue 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

6. **Verify Tokens** - Check if push tokens are registered:
   ```sql
   SELECT * FROM push_tokens;
   ```

## Troubleshooting

### Notifications Not Received

1. **Check Token Registration**
   - Verify tokens are being saved to `push_tokens` table
   - Check console logs for registration errors
   - Ensure user has granted notification permissions

2. **Check Queue**
   - Query `push_notification_queue` table to see if notifications are being queued
   - Check if `processed` field is being updated to `true`
   - If notifications are stuck in queue, check cron job status

3. **Check Edge Function Logs**
   - Go to Supabase Dashboard → Edge Functions
   - Check logs for `send-push-notification` and `process-notification-queue`
   - Look for errors or failed API calls

4. **Verify Cron Jobs**
   - Check if cron jobs are running:
     ```sql
     SELECT * FROM cron.job;
     ```
   - Check cron job run history:
     ```sql
     SELECT * FROM cron.job_run_details 
     ORDER BY start_time DESC 
     LIMIT 10;
     ```

5. **Check Expo Push Token**
   - Ensure the push token format is correct (starts with `ExponentPushToken[...]`)
   - Verify the token is valid by testing with Expo's push notification tool

6. **Check Trigger Functions**
   - Verify triggers are firing:
     ```sql
     SELECT * FROM pg_stat_user_functions 
     WHERE funcname LIKE 'notify_%';
     ```

### Common Issues

- **"Must use physical device"** - Push notifications don't work on simulators/emulators
- **"Permission not granted"** - User needs to enable notifications in device settings
- **"No push tokens found"** - User hasn't registered for notifications yet
- **Cron jobs not running** - Check if `pg_cron` extension is enabled
- **Edge function errors** - Check if `EXPO_ACCESS_TOKEN` environment variable is set (optional, not required for basic functionality)

## Environment Variables

The edge functions use the following environment variables (automatically available in Supabase):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `EXPO_ACCESS_TOKEN` - (Optional) Expo access token for enhanced push notification features

## Production Considerations

For production deployment:

1. **Expo Push Notification Service**
   - The app uses Expo's free push notification service
   - No additional setup required for basic functionality
   - For high-volume apps, consider Expo's paid plans

2. **Rate Limiting**
   - Expo has rate limits on push notifications
   - The queue system helps manage burst traffic
   - Consider batching notifications if needed

3. **Monitoring**
   - Monitor edge function logs regularly
   - Set up alerts for failed notifications
   - Track notification delivery rates

4. **Database Cleanup**
   - Consider archiving old processed notifications
   - Set up a cleanup job for old push tokens

5. **Security**
   - Push tokens are stored securely in the database
   - RLS policies protect user data
   - Edge functions use service role key for database access

## Summary

The push notification system is fully operational with:
- ✅ All 9 notification scenarios implemented
- ✅ Database triggers for automatic notification queuing
- ✅ Edge functions for sending notifications
- ✅ Cron jobs for automated processing
- ✅ Client-side registration and handling
- ✅ User settings for notification preferences
- ✅ Comprehensive error handling and logging

Users will now receive timely notifications for all important events in the app!
