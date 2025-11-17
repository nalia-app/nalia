
# Avatar Loading and Attendee Clickability Fix

## Summary
Fixed avatar loading issues throughout the app and made event attendees clickable to view their profiles.

## Issues Fixed

### 1. Avatar Images Not Loading
**Problem:** Avatar URLs were stored as local file paths (e.g., `file:///var/mobile/...`) instead of being uploaded to Supabase Storage. These local paths only work on the device where the image was picked, causing avatars to not display for other users or when viewing profiles.

**Solution:**
- Created a Supabase Storage bucket named `avatars` with proper RLS policies
- Implemented image upload utility functions in `utils/imageUpload.ts`
- Updated profile setup and edit profile screens to upload images to Supabase Storage
- Images are now stored with public URLs that work across all devices

### 2. Attendees Not Clickable in Event Details
**Problem:** Attendees in the Event Details screen were displayed but not clickable, preventing users from viewing their profiles.

**Solution:**
- Made attendee cards pressable in `app/event/[id].tsx`
- Added navigation to user profile screen when an attendee is tapped
- Added visual indicator (chevron icon) to show cards are clickable

### 3. Profile Avatar Not Loading
**Problem:** User profile avatars were not loading because they were using local file paths.

**Solution:**
- Fixed by implementing proper Supabase Storage upload
- All avatar URLs now point to Supabase Storage public URLs
- UserContext properly handles avatar URLs via the `photoUri` field

## Technical Changes

### Database Migration
Created migration `create_avatars_storage_bucket` that:
- Creates the `avatars` storage bucket with 5MB file size limit
- Supports JPEG, JPG, PNG, and WebP image formats
- Implements RLS policies:
  - Public read access for all avatar images
  - Users can only upload/update/delete their own avatars
  - Avatars are organized by user ID in folder structure

### New Files Created

#### `utils/imageUpload.ts`
Utility functions for image upload and management:
- `uploadImageToStorage()`: Uploads local images to Supabase Storage
  - Converts local file URIs to base64
  - Uploads to Supabase Storage with proper content type
  - Returns public URL for the uploaded image
  - Handles already-uploaded Supabase URLs gracefully
- `deleteOldAvatars()`: Cleans up old avatar files when a new one is uploaded

### Files Modified

#### `app/onboarding/profile-setup.tsx`
- Added image upload functionality during profile setup
- Shows loading indicator while uploading
- Stores Supabase Storage URL instead of local file path
- Handles upload failures gracefully

#### `app/edit-profile.tsx`
- Added image upload functionality when editing profile
- Shows loading indicator while uploading
- Cleans up old avatars after successful upload
- Prevents saving while upload is in progress

#### `app/event/[id].tsx`
- Made attendee cards clickable with `Pressable` component
- Added `handleAttendeePress()` function to navigate to user profiles
- Added chevron icon to indicate cards are clickable
- Improved visual feedback for interactive elements

#### `package.json`
Added dependencies:
- `expo-file-system`: For reading local image files
- `base64-arraybuffer`: For converting base64 to ArrayBuffer for upload

## How It Works

### Image Upload Flow
1. User picks an image using `expo-image-picker`
2. Local URI is temporarily stored in component state
3. When saving profile:
   - Check if URI is already a Supabase URL (skip upload if so)
   - Read local file as base64 using `expo-file-system`
   - Convert base64 to ArrayBuffer
   - Upload to Supabase Storage at path `{userId}/avatar-{timestamp}.{ext}`
   - Get public URL from Supabase
   - Save public URL to `profiles.avatar_url` in database
4. Old avatars are cleaned up to save storage space

### Avatar Display
- All avatar images now use `<Image source={{ uri: avatarUrl }} />`
- URLs point to Supabase Storage public URLs
- Images load correctly across all devices and users
- Fallback to icon if no avatar is set

### Attendee Interaction
- Attendee cards in Event Details are now `Pressable`
- Tapping an attendee navigates to their profile: `/user-profile/{userId}`
- Visual chevron icon indicates interactivity
- Works for both host and regular attendees

## Testing Recommendations

1. **Test Avatar Upload:**
   - Sign up as a new user and upload an avatar
   - Edit profile and change avatar
   - Verify old avatars are deleted from storage

2. **Test Avatar Display:**
   - View your own profile - avatar should display
   - View another user's profile - their avatar should display
   - View event details - all attendee avatars should display

3. **Test Attendee Clickability:**
   - Open an event with multiple attendees
   - Tap on any attendee card
   - Verify it navigates to their profile
   - Verify profile displays correctly with avatar

4. **Test Edge Cases:**
   - Upload very large images (should be limited to 5MB)
   - Upload unsupported formats (should fail gracefully)
   - Edit profile without changing avatar (should keep existing URL)
   - View profiles of users without avatars (should show fallback icon)

## Storage Bucket Configuration

**Bucket Name:** `avatars`
**Public Access:** Yes (read-only)
**File Size Limit:** 5MB
**Allowed MIME Types:** 
- image/jpeg
- image/jpg
- image/png
- image/webp

**Folder Structure:**
```
avatars/
  ├── {user-id-1}/
  │   └── avatar-{timestamp}.jpg
  ├── {user-id-2}/
  │   └── avatar-{timestamp}.png
  └── ...
```

## Security Considerations

- RLS policies ensure users can only modify their own avatars
- All avatars are publicly readable (appropriate for social app)
- File size limit prevents storage abuse
- MIME type restrictions prevent malicious file uploads
- User ID in path prevents filename collisions

## Performance Optimizations

- Old avatars are automatically cleaned up to save storage
- Images are uploaded with `upsert: true` to overwrite if needed
- Base64 conversion happens in memory (no temp files)
- Public URLs are cached by Supabase CDN

## Future Improvements

Potential enhancements for the future:
- Image compression before upload to reduce file sizes
- Image cropping/editing within the app
- Support for animated avatars (GIF, WebP animation)
- Avatar placeholder generation based on user initials
- Lazy loading for avatar images in lists
- Offline support with local caching
