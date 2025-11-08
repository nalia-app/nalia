
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { supabase } from "@/app/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

interface UserProfile {
  id: string;
  name: string;
  bio: string;
  interests: string[];
  hostedEvents: number;
  attendedEvents: number;
  mutualEvents: number;
  isFriend: boolean;
  friendshipStatus: string | null;
}

interface RecentEvent {
  id: string;
  description: string;
  event_date: string;
  icon: string;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      loadProfile();
    }
  }, [id, user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log("Loading profile for user:", id);

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (profileError) throw profileError;

      // Get interests
      const { data: interestsData } = await supabase
        .from("interests")
        .select("interest")
        .eq("user_id", id);

      // Count hosted events
      const { count: hostedCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("host_id", id);

      // Count attended events
      const { count: attendedCount } = await supabase
        .from("event_attendees")
        .select("*", { count: "exact", head: true })
        .eq("user_id", id)
        .eq("status", "approved");

      // Check friendship status
      const { data: friendshipData } = await supabase
        .from("friendships")
        .select("status")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .or(`user_id.eq.${id},friend_id.eq.${id}`)
        .single();

      // Count mutual events
      const { data: userEvents } = await supabase
        .from("event_attendees")
        .select("event_id")
        .eq("user_id", user.id);

      const userEventIds = userEvents?.map((e) => e.event_id) || [];

      const { count: mutualCount } = await supabase
        .from("event_attendees")
        .select("*", { count: "exact", head: true })
        .eq("user_id", id)
        .in("event_id", userEventIds);

      // Get recent events
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, description, event_date, icon")
        .eq("host_id", id)
        .order("event_date", { ascending: false })
        .limit(3);

      setProfile({
        id: profileData.id,
        name: profileData.name,
        bio: profileData.bio || "No bio yet",
        interests:
          interestsData?.map((i) => i.interest.replace("#", "")) || [],
        hostedEvents: hostedCount || 0,
        attendedEvents: attendedCount || 0,
        mutualEvents: mutualCount || 0,
        isFriend: !!friendshipData,
        friendshipStatus: friendshipData?.status || null,
      });

      setRecentEvents(eventsData || []);
    } catch (error: any) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: profile.id,
        status: "pending",
      });

      if (error) throw error;

      // Create notification
      await supabase.from("notifications").insert({
        user_id: profile.id,
        type: "friend",
        title: "Friend Request",
        message: `${user.name} wants to connect`,
        related_id: user.id,
      });

      Alert.alert("Success", "Friend request sent!");
      loadProfile();
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  const handleMessage = () => {
    console.log("Opening chat with user:", id);
    // For now, show alert since direct messaging isn't fully implemented
    Alert.alert("Info", "Direct messaging coming soon!");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    const diffDays = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.background, "#0a0a0a"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarLarge}>
              <IconSymbol name="person.fill" size={48} color={colors.text} />
            </View>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.bio}>{profile.bio}</Text>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.hostedEvents}</Text>
                <Text style={styles.statLabel}>Hosted</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.attendedEvents}</Text>
                <Text style={styles.statLabel}>Attended</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.mutualEvents}</Text>
                <Text style={styles.statLabel}>Mutual</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <Pressable style={styles.messageButton} onPress={handleMessage}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.messageButtonGradient}
                >
                  <IconSymbol
                    name="message.fill"
                    size={20}
                    color={colors.text}
                  />
                  <Text style={styles.messageButtonText}>Send Message</Text>
                </LinearGradient>
              </Pressable>

              {!profile.isFriend && (
                <Pressable
                  style={styles.addFriendButton}
                  onPress={handleAddFriend}
                >
                  <IconSymbol
                    name="person.badge.plus"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.addFriendText}>Add Friend</Text>
                </Pressable>
              )}

              {profile.friendshipStatus === "pending" && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>Request Pending</Text>
                </View>
              )}
            </View>
          </View>

          {profile.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.interestsContainer}>
                {profile.interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestText}>#{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {recentEvents.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Events</Text>
              {recentEvents.map((event) => (
                <Pressable
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => router.push(`/event/${event.id}` as any)}
                >
                  <View style={styles.eventIcon}>
                    <Text style={styles.eventIconText}>{event.icon}</Text>
                  </View>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventName}>{event.description}</Text>
                    <Text style={styles.eventDate}>
                      {formatDate(event.event_date)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: colors.primary,
    marginBottom: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    width: "100%",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.highlight,
  },
  actionButtons: {
    width: "100%",
    gap: 12,
  },
  messageButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  messageButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  addFriendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 8,
  },
  addFriendText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  pendingBadge: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
  },
  pendingText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestTag: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  interestText: {
    fontSize: 14,
    color: colors.secondary,
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlight,
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
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
