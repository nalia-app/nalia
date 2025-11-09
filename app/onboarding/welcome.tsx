
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useEffect } from 'react';

export default function WelcomeScreen() {
  const router = useRouter();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Fade in animation
    opacity.value = withTiming(1, { duration: 1000 });
    
    // Pulse animation for the button
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <LinearGradient 
      colors={['#1a1a2e', '#16213e', '#0f3460', '#533483']} 
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, fadeInStyle]}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Text style={styles.logo}>nalia</Text>
            <View style={styles.taglineContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                style={styles.taglineGradient}
              >
                <Text style={styles.tagline}>Meet people who share your interests</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Features Section */}
          <View style={styles.features}>
            <View style={styles.featureCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                style={styles.featureGradient}
              >
                <Text style={styles.featureIcon}>📍</Text>
                <Text style={styles.featureText}>Discover spontaneous meetups nearby</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.featureCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                style={styles.featureGradient}
              >
                <Text style={styles.featureIcon}>💬</Text>
                <Text style={styles.featureText}>Connect with like-minded people</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.featureCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                style={styles.featureGradient}
              >
                <Text style={styles.featureIcon}>✨</Text>
                <Text style={styles.featureText}>Create your own events instantly</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Button Section */}
          <View style={styles.buttonContainer}>
            <Animated.View style={animatedStyle}>
              <Pressable
                style={styles.button}
                onPress={() => router.push('/onboarding/signup' as any)}
              >
                <LinearGradient
                  colors={['#ffffff', '#f0f0f0']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Get Started</Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
            
            <Pressable
              style={styles.loginButton}
              onPress={() => router.push('/onboarding/login' as any)}
            >
              <Text style={styles.loginText}>Already have an account? Log in</Text>
            </Pressable>
          </View>
        </Animated.View>
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
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    fontSize: 72,
    fontFamily: 'PlayfairDisplay-Italic',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  taglineContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  taglineGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  tagline: {
    fontSize: 18,
    color: '#16213e',
    textAlign: 'center',
    fontWeight: '600',
  },
  features: {
    gap: 20,
    marginVertical: 20,
  },
  featureCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  featureGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  featureIcon: {
    fontSize: 36,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 20,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16213e',
  },
  buttonArrow: {
    fontSize: 24,
    fontWeight: '700',
    color: '#16213e',
  },
  loginButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
