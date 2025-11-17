
import { supabase } from '@/app/integrations/supabase/client';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

/**
 * Uploads an image to Supabase Storage and returns the public URL
 * @param uri - Local file URI from image picker
 * @param userId - User ID for organizing files
 * @param bucket - Storage bucket name (default: 'avatars')
 * @returns Public URL of the uploaded image or null if upload fails
 */
export async function uploadImageToStorage(
  uri: string,
  userId: string,
  bucket: string = 'avatars'
): Promise<string | null> {
  try {
    console.log('[ImageUpload] Starting upload for URI:', uri);

    // Check if URI is already a Supabase URL
    if (uri.includes('supabase.co') || uri.includes('supabase.in')) {
      console.log('[ImageUpload] URI is already a Supabase URL, returning as-is');
      return uri;
    }

    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determine file extension from URI
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('[ImageUpload] Uploading to path:', filePath);

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64);

    // Determine content type
    const contentType = fileExt === 'png' ? 'image/png' : 
                       fileExt === 'webp' ? 'image/webp' : 
                       'image/jpeg';

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('[ImageUpload] Upload error:', error);
      return null;
    }

    console.log('[ImageUpload] Upload successful:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log('[ImageUpload] Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[ImageUpload] Exception during upload:', error);
    return null;
  }
}

/**
 * Deletes old avatar images for a user (cleanup)
 * @param userId - User ID
 * @param currentAvatarUrl - Current avatar URL to keep
 * @param bucket - Storage bucket name (default: 'avatars')
 */
export async function deleteOldAvatars(
  userId: string,
  currentAvatarUrl: string | null,
  bucket: string = 'avatars'
): Promise<void> {
  try {
    // List all files in user's folder
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(userId);

    if (listError || !files) {
      console.error('[ImageUpload] Error listing files:', listError);
      return;
    }

    // Filter out the current avatar
    const currentFileName = currentAvatarUrl?.split('/').pop();
    const filesToDelete = files
      .filter(file => file.name !== currentFileName)
      .map(file => `${userId}/${file.name}`);

    if (filesToDelete.length > 0) {
      console.log('[ImageUpload] Deleting old avatars:', filesToDelete);
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove(filesToDelete);

      if (deleteError) {
        console.error('[ImageUpload] Error deleting old avatars:', deleteError);
      }
    }
  } catch (error) {
    console.error('[ImageUpload] Exception during cleanup:', error);
  }
}
