
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { useUser } from '@/contexts/UserContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { uploadImageToStorage } from '@/utils/imageUpload';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { session } = useUser();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name to continue.');
      return;
    }

    if (!session?.user) {
      Alert.alert('Error', 'No user session found. Please sign up again.');
      return;
    }

    setLoading(true);
    try {
      console.log('[ProfileSetup] Updating profile for user:', session.user.id);
      
      let avatarUrl = photoUri;

      // Upload image to Supabase Storage if a local image was selected
      if (photoUri && !photoUri.includes('supabase.co') && !photoUri.includes('supabase.in')) {
        setUploadingImage(true);
        console.log('[ProfileSetup] Uploading avatar to storage...');
        const uploadedUrl = await uploadImageToStorage(photoUri, session.user.id);
        
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
          console.log('[ProfileSetup] Avatar uploaded successfully:', uploadedUrl);
        } else {
          console.warn('[ProfileSetup] Failed to upload avatar, will save local URI');
        }
        setUploadingImage(false);
      }

      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[ProfileSetup] Error checking profile:', checkError);
        Alert.alert('Error', 'Failed to check profile. Please try again.');
        return;
      }

      if (existingProfile) {
        // Profile exists, update it
        console.log('[ProfileSetup] Profile exists, updating...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            name: name.trim(),
            bio: bio.trim() || null,
            avatar_url: avatarUrl || null,
          })
          .eq('id', session.user.id);

        if (updateError) {
          console.error('[ProfileSetup] Error updating profile:', updateError);
          Alert.alert('Error', 'Failed to update profile. Please try again.');
          return;
        }

        console.log('[ProfileSetup] Profile updated successfully');
      } else {
        // Profile doesn't exist, create it
        console.log('[ProfileSetup] Profile does not exist, creating...');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            name: name.trim(),
            bio: bio.trim() || null,
            avatar_url: avatarUrl || null,
          });

        if (insertError) {
          console.error('[ProfileSetup] Error creating profile:', insertError);
          Alert.alert('Error', 'Failed to create profile. Please try again.');
          return;
        }

        console.log('[ProfileSetup] Profile created successfully');
      }

      // Navigate to permissions screen
      router.push('/onboarding/permissions');
    } catch (error: any) {
      console.error('[ProfileSetup] Exception:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  return (
    <LinearGradient colors={[colors.background, '#1a1a2e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

          <Pressable style={styles.photoContainer} onPress={pickImage} disabled={uploadingImage || loading}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <IconSymbol name="camera" size={32} color={colors.textSecondary} />
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </View>
            )}
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </Pressable>

          <View style={styles.form}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              editable={!loading && !uploadingImage}
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell people about yourself..."
              placeholderTextColor={colors.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading && !uploadingImage}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.continueButton, (!name.trim() || loading || uploadingImage) && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!name.trim() || loading || uploadingImage}
          >
            {loading || uploadingImage ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.text} />
                <Text style={styles.continueButtonText}>
                  {uploadingImage ? 'Uploading Image...' : 'Saving Profile...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </Pressable>
        </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 32,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    gap: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bioInput: {
    minHeight: 100,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
