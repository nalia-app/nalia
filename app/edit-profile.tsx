
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useUser } from '@/contexts/UserContext';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToStorage, deleteOldAvatars } from '@/utils/imageUpload';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useUser();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [photoUri, setPhotoUri] = useState(user?.photoUri || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setSaving(true);
    try {
      let finalPhotoUri = photoUri;

      // Upload image to Supabase Storage if a new local image was selected
      if (photoUri && !photoUri.includes('supabase.co') && !photoUri.includes('supabase.in')) {
        setUploadingImage(true);
        console.log('[EditProfile] Uploading new avatar to storage...');
        const uploadedUrl = await uploadImageToStorage(photoUri, user.id);
        
        if (uploadedUrl) {
          finalPhotoUri = uploadedUrl;
          console.log('[EditProfile] Avatar uploaded successfully:', uploadedUrl);
          
          // Clean up old avatars
          await deleteOldAvatars(user.id, uploadedUrl);
        } else {
          console.warn('[EditProfile] Failed to upload avatar');
          Alert.alert('Warning', 'Failed to upload image. Your profile will be saved without the new photo.');
          finalPhotoUri = user.photoUri || ''; // Keep old photo
        }
        setUploadingImage(false);
      }

      await updateProfile({ name, bio, photoUri: finalPhotoUri });
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('[EditProfile] Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  return (
    <LinearGradient colors={[colors.background, '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} disabled={saving || uploadingImage}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving || uploadingImage}>
            {saving || uploadingImage ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.photoSection}>
            <Pressable style={styles.photoButton} onPress={pickImage} disabled={saving || uploadingImage}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <IconSymbol name="person.fill" size={48} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.photoEditBadge}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <IconSymbol name="camera.fill" size={16} color={colors.text} />
                )}
              </View>
            </Pressable>
            <Pressable onPress={pickImage} disabled={saving || uploadingImage}>
              <Text style={styles.photoLabel}>
                {uploadingImage ? 'Uploading...' : 'Change Photo'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                editable={!saving && !uploadingImage}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell people about yourself..."
                placeholderTextColor={colors.textSecondary}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                maxLength={150}
                editable={!saving && !uploadingImage}
              />
              <Text style={styles.charCount}>{bio.length}/150</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 100,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  photoButton: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.highlight,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  photoLabel: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 12,
    fontWeight: '600',
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});
