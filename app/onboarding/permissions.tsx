
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useUser } from '@/contexts/UserContext';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export default function PermissionsScreen() {
  const router = useRouter();
  const { completeOnboarding } = useUser();
  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationGranted(true);
        Alert.alert('Success', 'Location permission granted');
      } else {
        Alert.alert('Permission Denied', 'Location permission is required to find nearby events');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotificationsGranted(true);
        Alert.alert('Success', 'Notification permission granted');
      } else {
        Alert.alert('Permission Denied', 'Notifications help you stay updated on events');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const handleFinish = async () => {
    await completeOnboarding();
    router.replace('/(tabs)/(home)/' as any);
  };

  return (
    <LinearGradient colors={[colors.background, '#0a0a0a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.title}>Enable Permissions</Text>
          <Text style={styles.subtitle}>
            To get the best experience, we need a couple of permissions
          </Text>

          <View style={styles.permissions}>
            <View style={styles.permissionCard}>
              <View style={styles.permissionIcon}>
                <IconSymbol name="location.fill" size={32} color={colors.primary} />
              </View>
              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>Location</Text>
                <Text style={styles.permissionDescription}>
                  Find nearby events and meetups in your area
                </Text>
              </View>
              <Pressable
                style={[styles.permissionButton, locationGranted && styles.permissionButtonGranted]}
                onPress={requestLocationPermission}
                disabled={locationGranted}
              >
                <Text style={styles.permissionButtonText}>
                  {locationGranted ? 'Granted ✓' : 'Enable'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.permissionCard}>
              <View style={styles.permissionIcon}>
                <IconSymbol name="bell.fill" size={32} color={colors.accent} />
              </View>
              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>Notifications</Text>
                <Text style={styles.permissionDescription}>
                  Stay updated on event invites and messages
                </Text>
              </View>
              <Pressable
                style={[styles.permissionButton, notificationsGranted && styles.permissionButtonGranted]}
                onPress={requestNotificationPermission}
                disabled={notificationsGranted}
              >
                <Text style={styles.permissionButtonText}>
                  {notificationsGranted ? 'Granted ✓' : 'Enable'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.button} onPress={handleFinish}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {locationGranted && notificationsGranted ? 'Get Started' : 'Skip for Now'}
                </Text>
              </LinearGradient>
            </Pressable>
            <Text style={styles.footerNote}>
              You can change these permissions later in settings
            </Text>
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
    paddingTop: 40,
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
    marginBottom: 40,
    lineHeight: 22,
  },
  permissions: {
    gap: 16,
    marginBottom: 40,
  },
  permissionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  permissionIcon: {
    marginBottom: 16,
  },
  permissionContent: {
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  permissionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  permissionButtonGranted: {
    backgroundColor: colors.highlight,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
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
  footerNote: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
