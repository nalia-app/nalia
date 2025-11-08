
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Share,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";

const RECENT_EVENTS = [
  {
    id: "1",
    name: "Coffee & Chat",
    date: "Today",
    icon: "☕",
  },
  {
    id: "2",
    name: "Morning Yoga",
    date: "Saturday",
    icon: "🧘",
  },
  {
    id: "3",
    name: "Photography Walk",
    date: "Last Week",
    icon: "📷",
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useUser();

  const handleEditProfile = () => {
    router.push("/edit-profile" as any);
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${user?.name || 'my'} profile on Nalia! Join me for spontaneous meetups and events.`,
        title: 'Share Profile',
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
      Alert.alert('Error', 'Could not share profile');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('Logging out user...');
            await logout();
            console.log('User logged out, navigating to onboarding...');
            // Navigate to onboarding index which will redirect to welcome screen
            router.replace('/onboarding/' as any);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Pressable
          style={styles.settingsButton}
          onPress={() => Alert.alert("Settings", "Open settings")}
        >
          <IconSymbol name="gear" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.avatarGradient}
            >
              {user?.photoUri ? (
                <Image source={{ uri: user.photoUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <IconSymbol name="person.fill" size={48} color={colors.text} />
                </View>
              )}
            </LinearGradient>
          </View>
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <Text style={styles.bio}>{user?.bio || 'No bio yet'}</Text>
          <Pressable
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.editButtonGradient}
            >
              <IconSymbol name="pencil" size={16} color={colors.text} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Hosted</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>28</Text>
            <Text style={styles.statLabel}>Attended</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>45</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
        </View>

        {/* Interests */}
        {user?.interests && user.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsContainer}>
              {user.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Events</Text>
          {RECENT_EVENTS.map((event) => (
            <Pressable
              key={event.id}
              style={styles.eventCard}
              onPress={() =>
                Alert.alert(event.name, `Event details for ${event.name}`)
              }
            >
              <LinearGradient
                colors={["rgba(187, 134, 252, 0.1)", "rgba(3, 218, 198, 0.1)"]}
                style={styles.eventCardGradient}
              >
                <View style={styles.eventIcon}>
                  <Text style={styles.eventIconText}>{event.icon}</Text>
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventDate}>{event.date}</Text>
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={20}
                  color={colors.textSecondary}
                />
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={styles.actionButton}
            onPress={handleShareProfile}
          >
            <IconSymbol name="square.and.arrow.up" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Share Profile</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={handleLogout}
          >
            <IconSymbol name="arrow.right.square" size={20} color={colors.accent} />
            <Text style={[styles.actionButtonText, { color: colors.accent }]}>
              Logout
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
  },
  settingsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    padding: 4,
    borderRadius: 64,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  editButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  editButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.highlight,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestTag: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  interestText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  eventCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  eventCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  eventIconText: {
    fontSize: 24,
  },
  eventContent: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
});
