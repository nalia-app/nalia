
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { useUser } from '@/contexts/UserContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import * as AppleAuthentication from 'expo-apple-authentication';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Dynamically import Google Sign-In to handle cases where it's not available
let GoogleSignin: any = null;
let statusCodes: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const googleSignInModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignInModule.GoogleSignin;
  statusCodes = googleSignInModule.statusCodes;
} catch (error) {
  console.warn('[Signup] Google Sign-In module not available:', error);
}

export default function SignupScreen() {
  const router = useRouter();
  const { setUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [googleSignInAvailable, setGoogleSignInAvailable] = useState(false);

  // Animated values for background elements
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Subtle rotation animation for background orbs
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    // Subtle scale animation
    scale.value = withRepeat(
      withTiming(1.2, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedOrb1Style = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const animatedOrb2Style = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${-rotation.value}deg` },
      { scale: scale.value * 0.8 },
    ],
  }));

  useEffect(() => {
    // Configure Google Sign In if available
    if (GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // Replace with your actual Web Client ID from Google Cloud Console
          iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // Optional: iOS Client ID
          offlineAccess: false,
        });
        setGoogleSignInAvailable(true);
        console.log('[Signup] Google Sign-In configured successfully');
      } catch (error) {
        console.error('[Signup] Error configuring Google Sign-In:', error);
        setGoogleSignInAvailable(false);
      }
    } else {
      console.warn('[Signup] Google Sign-In not available - native module not found');
      setGoogleSignInAvailable(false);
    }

    // Check if Apple Authentication is available
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
  }, []);

  const createInitialProfile = async (userId: string, email: string) => {
    try {
      console.log('[Signup] Creating initial profile for user:', userId);
      
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log('[Signup] Profile already exists');
        return;
      }

      // Create a basic profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: email.split('@')[0], // Use email prefix as temporary name
          bio: '',
        });

      if (profileError) {
        console.error('[Signup] Error creating profile:', profileError);
        throw profileError;
      }

      console.log('[Signup] Initial profile created successfully');
    } catch (error) {
      console.error('[Signup] Exception creating profile:', error);
      throw error;
    }
  };

  const handleEmailSignup = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      console.log('[Signup] Attempting email signup for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed'
        }
      });

      if (error) {
        console.error('[Signup] Error:', error);
        Alert.alert('Signup Error', error.message);
        return;
      }

      console.log('[Signup] Signup successful:', data.user?.id);
      console.log('[Signup] Session:', data.session ? 'exists' : 'null');
      
      // Create initial profile if user and session exist
      if (data.user && data.session) {
        try {
          await createInitialProfile(data.user.id, email);
          
          // Show email verification message
          Alert.alert(
            'Account Created',
            'Please check your email and click the verification link to complete your registration.',
            [{ text: 'OK', onPress: () => router.replace('/onboarding/interests') }]
          );
        } catch (profileError) {
          console.error('[Signup] Profile creation failed:', profileError);
          // Still proceed to interests even if profile creation fails
          // The UserContext will handle creating the profile later
          Alert.alert(
            'Account Created',
            'Please check your email and click the verification link. You can continue with the onboarding process.',
            [{ text: 'OK', onPress: () => router.replace('/onboarding/interests') }]
          );
        }
      } else {
        // No session means email confirmation is required before proceeding
        Alert.alert(
          'Verify Your Email',
          'Please check your email and click the verification link to complete your registration. After verification, you can log in.',
          [{ text: 'OK', onPress: () => router.replace('/onboarding/login') }]
        );
      }
    } catch (error: any) {
      console.error('[Signup] Exception:', error);
      Alert.alert('Error', error.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!googleSignInAvailable || !GoogleSignin) {
      Alert.alert(
        'Not Available',
        'Google Sign-In is not available. Please use email signup or try rebuilding the app with "npx expo prebuild --clean".'
      );
      return;
    }

    setLoading(true);
    try {
      console.log('[Signup] Attempting Google signup');
      
      // Check if device supports Google Play services
      await GoogleSignin.hasPlayServices();
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      console.log('[Signup] Google sign in successful:', userInfo);
      
      if (userInfo.data?.idToken) {
        // Sign in to Supabase with the Google ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        });

        if (error) {
          console.error('[Signup] Supabase Google error:', error);
          Alert.alert('Google Signup Error', error.message);
          return;
        }

        console.log('[Signup] Google signup successful:', data.user?.id);
        
        // Check if user needs onboarding
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (!profile) {
            // New user, create profile and proceed to interests
            try {
              await createInitialProfile(data.user.id, data.user.email || '');
              router.replace('/onboarding/interests');
            } catch (profileError) {
              console.error('[Signup] Profile creation failed:', profileError);
              // Still proceed to interests
              router.replace('/onboarding/interests');
            }
          }
        }
        // Otherwise, UserContext will handle navigation to home
      } else {
        throw new Error('No ID token received from Google');
      }
    } catch (error: any) {
      console.error('[Signup] Google exception:', error);
      
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[Signup] User cancelled Google sign in');
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Error', 'Google sign in is already in progress');
      } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play services not available or outdated');
      } else {
        Alert.alert('Error', error.message || 'An error occurred with Google signup');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignup = async () => {
    if (!appleAuthAvailable) {
      Alert.alert('Not Available', 'Apple Sign In is only available on iOS 13+');
      return;
    }

    setLoading(true);
    try {
      console.log('[Signup] Attempting Apple signup');
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[Signup] Apple sign in successful:', credential);

      if (credential.identityToken) {
        // Sign in to Supabase with the Apple ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          console.error('[Signup] Supabase Apple error:', error);
          Alert.alert('Apple Signup Error', error.message);
          return;
        }

        console.log('[Signup] Apple signup successful:', data.user?.id);
        
        // Check if user needs onboarding
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (!profile) {
            // New user, create profile and proceed to interests
            try {
              await createInitialProfile(data.user.id, data.user.email || '');
              router.replace('/onboarding/interests');
            } catch (profileError) {
              console.error('[Signup] Profile creation failed:', profileError);
              // Still proceed to interests
              router.replace('/onboarding/interests');
            }
          }
        }
        // Otherwise, UserContext will handle navigation to home
      } else {
        throw new Error('No identity token received from Apple');
      }
    } catch (error: any) {
      console.error('[Signup] Apple exception:', error);
      
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('[Signup] User cancelled Apple sign in');
      } else {
        Alert.alert('Error', error.message || 'An error occurred with Apple signup');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Multi-layer gradient background */}
      <LinearGradient 
        colors={['#0a0a1a', '#1a0f2e', '#2d1b4e', '#1a0f2e', '#0a0a1a']} 
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Animated orb 1 - Top right */}
      <Animated.View style={[styles.orb1, animatedOrb1Style]}>
        <LinearGradient
          colors={['rgba(187, 134, 252, 0.15)', 'rgba(187, 134, 252, 0.05)', 'transparent']}
          style={styles.orbGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Animated orb 2 - Bottom left */}
      <Animated.View style={[styles.orb2, animatedOrb2Style]}>
        <LinearGradient
          colors={['rgba(3, 218, 198, 0.12)', 'rgba(3, 218, 198, 0.04)', 'transparent']}
          style={styles.orbGradient}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
        />
      </Animated.View>

      {/* Accent orb 3 - Center */}
      <View style={styles.orb3}>
        <LinearGradient
          colors={['rgba(255, 64, 129, 0.08)', 'transparent']}
          style={styles.orbGradient}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <View style={styles.backButtonInner}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </View>
          </Pressable>

          <Text style={styles.logo}>nalia</Text>
          <Text style={styles.subtitle}>Create your account</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleEmailSignup}
              disabled={loading}
            >
              <LinearGradient
                colors={['#BB86FC', '#9D6FDB']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Creating Account...' : 'Sign Up with Email'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {googleSignInAvailable ? (
            <Pressable
              style={[styles.googleButton, loading && styles.buttonDisabled]}
              onPress={handleGoogleSignup}
              disabled={loading}
            >
              <Image
                source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </Pressable>
          ) : (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Google Sign-In requires native setup. Please run: npx expo prebuild --clean
              </Text>
            </View>
          )}

          {Platform.OS === 'ios' && appleAuthAvailable && (
            <Pressable
              style={[styles.appleButton, loading && styles.buttonDisabled]}
              onPress={handleAppleSignup}
              disabled={loading}
            >
              <IconSymbol 
                ios_icon_name="apple.logo" 
                android_material_icon_name="apple" 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </Pressable>
          )}

          {Platform.OS === 'android' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Apple Sign In is only available on iOS devices
              </Text>
            </View>
          )}

          <Pressable
            style={styles.loginLink}
            onPress={() => router.push('/onboarding/login' as any)}
            disabled={loading}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Log In</Text>
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  orb1: {
    position: 'absolute',
    top: -150,
    right: -150,
    width: 400,
    height: 400,
  },
  orb2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 350,
    height: 350,
  },
  orb3: {
    position: 'absolute',
    top: '40%',
    left: '30%',
    width: 300,
    height: 300,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 200,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    zIndex: 10,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  logo: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 64,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(187, 134, 252, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 48,
    fontWeight: '300',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  input: {
    padding: 18,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#BB86FC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '300',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#3C4043',
    fontSize: 16,
    fontWeight: '600',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  loginLinkBold: {
    color: colors.primary,
    fontWeight: '700',
  },
});
