
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { useUser } from '@/contexts/UserContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import * as AppleAuthentication from 'expo-apple-authentication';

// Dynamically import Google Sign-In to handle cases where it's not available
let GoogleSignin: any = null;
let statusCodes: any = null;

try {
  const googleSignInModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignInModule.GoogleSignin;
  statusCodes = googleSignInModule.statusCodes;
} catch (error) {
  console.warn('[Login] Google Sign-In module not available:', error);
}

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [googleSignInAvailable, setGoogleSignInAvailable] = useState(false);

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
        console.log('[Login] Google Sign-In configured successfully');
      } catch (error) {
        console.error('[Login] Error configuring Google Sign-In:', error);
        setGoogleSignInAvailable(false);
      }
    } else {
      console.warn('[Login] Google Sign-In not available - native module not found');
      setGoogleSignInAvailable(false);
    }

    // Check if Apple Authentication is available
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
  }, []);

  const createInitialProfile = async (userId: string, email: string) => {
    try {
      console.log('[Login] Creating initial profile for user:', userId);
      
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log('[Login] Profile already exists');
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
        console.error('[Login] Error creating profile:', profileError);
        throw profileError;
      }

      console.log('[Login] Initial profile created successfully');
    } catch (error) {
      console.error('[Login] Exception creating profile:', error);
      throw error;
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      console.log('[Login] Attempting email login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Login] Error:', error);
        Alert.alert('Login Error', error.message);
        return;
      }

      console.log('[Login] Login successful:', data.user?.id);
      
      // Check if profile exists, create if not
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profile) {
          console.log('[Login] No profile found, creating one');
          try {
            await createInitialProfile(data.user.id, email);
            // Redirect to onboarding
            router.replace('/onboarding/interests');
          } catch (profileError) {
            console.error('[Login] Profile creation failed:', profileError);
            // Still proceed to interests
            router.replace('/onboarding/interests');
          }
          return;
        }
      }
      
      // Navigation will be handled by UserContext
      // The app will automatically redirect to the home screen
    } catch (error: any) {
      console.error('[Login] Exception:', error);
      Alert.alert('Error', error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!googleSignInAvailable || !GoogleSignin) {
      Alert.alert(
        'Not Available',
        'Google Sign-In is not available. Please use email login or try rebuilding the app with "npx expo prebuild --clean".'
      );
      return;
    }

    setLoading(true);
    try {
      console.log('[Login] Attempting Google login');
      
      // Check if device supports Google Play services
      await GoogleSignin.hasPlayServices();
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      console.log('[Login] Google sign in successful:', userInfo);
      
      if (userInfo.data?.idToken) {
        // Sign in to Supabase with the Google ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        });

        if (error) {
          console.error('[Login] Supabase Google error:', error);
          Alert.alert('Google Login Error', error.message);
          return;
        }

        console.log('[Login] Google login successful:', data.user?.id);
        
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
              console.error('[Login] Profile creation failed:', profileError);
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
      console.error('[Login] Google exception:', error);
      
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[Login] User cancelled Google sign in');
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Error', 'Google sign in is already in progress');
      } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play services not available or outdated');
      } else {
        Alert.alert('Error', error.message || 'An error occurred with Google login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (!appleAuthAvailable) {
      Alert.alert('Not Available', 'Apple Sign In is only available on iOS 13+');
      return;
    }

    setLoading(true);
    try {
      console.log('[Login] Attempting Apple login');
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[Login] Apple sign in successful:', credential);

      if (credential.identityToken) {
        // Sign in to Supabase with the Apple ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          console.error('[Login] Supabase Apple error:', error);
          Alert.alert('Apple Login Error', error.message);
          return;
        }

        console.log('[Login] Apple login successful:', data.user?.id);
        
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
              console.error('[Login] Profile creation failed:', profileError);
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
      console.error('[Login] Apple exception:', error);
      
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('[Login] User cancelled Apple sign in');
      } else {
        Alert.alert('Error', error.message || 'An error occurred with Apple login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.background, '#1a1a2e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>

          <Text style={styles.logo}>nalia</Text>
          <Text style={styles.subtitle}>Welcome back</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Logging In...' : 'Log In with Email'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {googleSignInAvailable ? (
            <Pressable
              style={[styles.socialButton, loading && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <IconSymbol name="logo.google" size={24} color={colors.text} />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
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
              style={[styles.socialButton, loading && styles.buttonDisabled]}
              onPress={handleAppleLogin}
              disabled={loading}
            >
              <IconSymbol name="logo.apple" size={24} color={colors.text} />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
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
            style={styles.signupLink}
            onPress={() => router.push('/onboarding/signup' as any)}
            disabled={loading}
          >
            <Text style={styles.signupLinkText}>
              Don&apos;t have an account? <Text style={styles.signupLinkBold}>Sign Up</Text>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 64,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: colors.textSecondary,
    marginHorizontal: 16,
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  socialButtonText: {
    color: colors.text,
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
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  signupLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupLinkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  signupLinkBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});
