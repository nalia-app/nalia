
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { colors } from '@/styles/commonStyles';

export default function OnboardingIndex() {
  const router = useRouter();
  const { isOnboarded } = useUser();

  useEffect(() => {
    if (isOnboarded) {
      router.replace('/(tabs)/(home)/' as any);
    } else {
      router.replace('/onboarding/welcome' as any);
    }
  }, [isOnboarded]);

  return (
    <View style={styles.container}>
      {/* Loading state */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
