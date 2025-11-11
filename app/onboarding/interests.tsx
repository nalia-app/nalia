
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { useUser } from '@/contexts/UserContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { prepareInterestForStorage, areInterestsEqual } from '@/utils/emojiUtils';

const SUGGESTED_INTERESTS = [
  '☕ Coffee',
  '🏃 Running',
  '🎨 Art',
  '🎵 Music',
  '📚 Reading',
  '🎮 Gaming',
  '🍕 Food',
  '✈️ Travel',
  '💪 Fitness',
  '🎬 Movies',
  '📸 Photography',
  '🧘 Yoga',
  '🎭 Theater',
  '🏀 Sports',
  '🌱 Nature',
  '💻 Tech',
  '🎤 Karaoke',
  '🍷 Wine',
  '🎲 Board Games',
  '🐕 Pets',
];

export default function InterestsScreen() {
  const router = useRouter();
  const { session } = useUser();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleInterest = (interest: string) => {
    // Check if this interest (without emoji) already exists
    const interestExists = selectedInterests.some(existing => 
      areInterestsEqual(existing, interest)
    );

    if (interestExists) {
      // Remove the interest (compare without emojis)
      setSelectedInterests(selectedInterests.filter(i => 
        !areInterestsEqual(i, interest)
      ));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const addCustomInterest = () => {
    const trimmedInterest = customInterest.trim();
    if (!trimmedInterest) return;

    // Check if this interest (without emoji) already exists
    const interestExists = selectedInterests.some(existing => 
      areInterestsEqual(existing, trimmedInterest)
    );

    if (interestExists) {
      Alert.alert('Duplicate Interest', 'You have already added this interest.');
      return;
    }

    setSelectedInterests([...selectedInterests, trimmedInterest]);
    setCustomInterest('');
  };

  const handleContinue = async () => {
    if (selectedInterests.length < 3) {
      Alert.alert('Select Interests', 'Please select at least 3 interests to continue.');
      return;
    }

    if (!session?.user) {
      Alert.alert('Error', 'No user session found. Please sign up again.');
      return;
    }

    setLoading(true);
    try {
      console.log('[Interests] Saving interests for user:', session.user.id);
      
      // First, ensure the profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!existingProfile) {
        console.log('[Interests] Profile does not exist, creating one');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            name: session.user.email?.split('@')[0] || 'User',
            bio: '',
          });

        if (profileError) {
          console.error('[Interests] Error creating profile:', profileError);
          Alert.alert('Error', 'Failed to create profile. Please try again.');
          return;
        }
      }

      // Save interests to database WITHOUT emojis
      const interestsToInsert = selectedInterests.map(interest => ({
        user_id: session.user.id,
        interest: prepareInterestForStorage(interest), // Strip emojis before saving
      }));

      console.log('[Interests] Prepared interests for storage:', interestsToInsert);

      const { error } = await supabase
        .from('interests')
        .insert(interestsToInsert);

      if (error) {
        console.error('[Interests] Error saving interests:', error);
        Alert.alert('Error', `Failed to save interests: ${error.message}`);
        return;
      }

      console.log('[Interests] Interests saved successfully');
      router.push('/onboarding/profile-setup');
    } catch (error: any) {
      console.error('[Interests] Exception:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.background, '#1a1a2e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>What are you into?</Text>
          <Text style={styles.subtitle}>
            Select at least 3 interests ({selectedInterests.length}/3)
          </Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.interestsGrid}>
            {SUGGESTED_INTERESTS.map((interest) => {
              const isSelected = selectedInterests.some(selected => 
                areInterestsEqual(selected, interest)
              );
              
              return (
                <Pressable
                  key={interest}
                  style={[
                    styles.interestChip,
                    isSelected && styles.interestChipSelected,
                  ]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text
                    style={[
                      styles.interestText,
                      isSelected && styles.interestTextSelected,
                    ]}
                  >
                    {interest}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.customSection}>
            <Text style={styles.customTitle}>Add your own</Text>
            <View style={styles.customInputContainer}>
              <TextInput
                style={styles.customInput}
                placeholder="Type an interest..."
                placeholderTextColor={colors.textSecondary}
                value={customInterest}
                onChangeText={setCustomInterest}
                onSubmitEditing={addCustomInterest}
                returnKeyType="done"
              />
              <Pressable style={styles.addButton} onPress={addCustomInterest}>
                <IconSymbol name="plus" size={24} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {selectedInterests.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={styles.selectedTitle}>Your interests:</Text>
              <View style={styles.selectedGrid}>
                {selectedInterests.map((interest, index) => (
                  <View key={`${interest}-${index}`} style={styles.selectedChip}>
                    <Text style={styles.selectedText}>{interest}</Text>
                    <Pressable onPress={() => toggleInterest(interest)}>
                      <IconSymbol name="xmark" size={16} color={colors.text} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.continueButton,
              (selectedInterests.length < 3 || loading) && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={selectedInterests.length < 3 || loading}
          >
            <Text style={styles.continueButtonText}>
              {loading ? 'Saving...' : 'Continue'}
            </Text>
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
  header: {
    padding: 24,
    paddingBottom: 16,
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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 0,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  interestChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  interestText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  interestTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  customSection: {
    marginTop: 32,
  },
  customTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  customInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  customInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSection: {
    marginTop: 32,
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  selectedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  selectedText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
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
});
