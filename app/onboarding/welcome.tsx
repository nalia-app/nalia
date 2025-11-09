
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={[colors.background, '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.logo}>nalia</Text>
          <Text style={styles.tagline}>Turn ideas into real connections</Text>
          
          <View style={styles.features}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📍</Text>
              <Text style={styles.featureText}>Discover spontaneous meetups nearby</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>💬</Text>
              <Text style={styles.featureText}>Connect with like-minded people</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>✨</Text>
              <Text style={styles.featureText}>Create your own events instantly</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              style={styles.button}
              onPress={() => router.push('/onboarding/signup' as any)}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Get Started</Text>
              </LinearGradient>
            </Pressable>
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 64,
    fontFamily: 'PlayfairDisplay-Italic',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  tagline: {
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 60,
  },
  features: {
    gap: 32,
    marginBottom: 60,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureText: {
    flex: 1,
    fontSize: 18,
    color: colors.text,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
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
