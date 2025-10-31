
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useUser } from '@/contexts/UserContext';

const SUGGESTED_INTERESTS = [
  '☕ Coffee',
  '🏃 Running',
  '🎵 Music',
  '📚 Books',
  '🍕 Food',
  '🎮 Gaming',
  '🏀 Basketball',
  '🧘 Yoga',
  '🎨 Art',
  '💼 Networking',
  '🌿 Nature',
  '🎬 Movies',
  '✈️ Travel',
  '📷 Photography',
  '🍷 Wine',
  '🎭 Theater',
];

export default function InterestsScreen() {
  const router = useRouter();
  const { updateProfile } = useUser();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !selectedInterests.includes(customInterest.trim())) {
      setSelectedInterests([...selectedInterests, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const handleContinue = () => {
    if (selectedInterests.length < 3) {
      Alert.alert('Select Interests', 'Please select at least 3 interests');
      return;
    }

    updateProfile({ interests: selectedInterests });
    router.push('/onboarding/profile-setup' as any);
  };

  return (
    <LinearGradient colors={[colors.background, '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={28} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>What are you interested in?</Text>
          <Text style={styles.subtitle}>
            Select at least 3 interests to personalize your experience
          </Text>

          <View style={styles.selectedCount}>
            <Text style={styles.selectedCountText}>
              {selectedInterests.length} selected {selectedInterests.length >= 3 ? '✓' : ''}
            </Text>
          </View>

          <View style={styles.interestsGrid}>
            {SUGGESTED_INTERESTS.map((interest) => (
              <Pressable
                key={interest}
                style={[
                  styles.interestChip,
                  selectedInterests.includes(interest) && styles.interestChipSelected,
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text
                  style={[
                    styles.interestText,
                    selectedInterests.includes(interest) && styles.interestTextSelected,
                  ]}
                >
                  {interest}
                </Text>
              </Pressable>
            ))}
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
              />
              <Pressable style={styles.addButton} onPress={addCustomInterest}>
                <IconSymbol name="plus.circle.fill" size={32} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {selectedInterests.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={styles.selectedTitle}>Your Interests</Text>
              <View style={styles.selectedList}>
                {selectedInterests.map((interest) => (
                  <View key={interest} style={styles.selectedChip}>
                    <Text style={styles.selectedChipText}>{interest}</Text>
                    <Pressable onPress={() => toggleInterest(interest)}>
                      <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.button, selectedInterests.length < 3 && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={selectedInterests.length < 3}
          >
            <LinearGradient
              colors={selectedInterests.length >= 3 ? [colors.primary, colors.secondary] : [colors.card, colors.card]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  selectedCount: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  interestChip: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.highlight,
  },
  interestChipSelected: {
    backgroundColor: 'rgba(187, 134, 252, 0.2)',
    borderColor: colors.primary,
  },
  interestText: {
    fontSize: 16,
    color: colors.text,
  },
  interestTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  customSection: {
    marginBottom: 32,
  },
  customTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  addButton: {
    padding: 4,
  },
  selectedSection: {
    marginBottom: 32,
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  selectedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  selectedChipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingVertical: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.highlight,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
});
