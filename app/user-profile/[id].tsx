
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/app/integrations/supabase/client";

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
  avatar_url: string | null;
}

interface RecentEvent {
  id: string;
  description: string;
  event_date: string;
  icon: string;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const loadProfile = async () => {
    try {
      console.log("[UserProfile] Loading profile for user:", id);
      setLoading(true);

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (profileError) {
        console.error("[UserProfile] Error loading profile:", profileError);
        Alert.alert("Error", "Failed to load user profile");
        router.back();
        return;
      }

      // Get user interests
      const { data: interestsData } = await supabase
        .from("interests")
        .select("interest")
        .eq("user_id", id);

      // Get hosted events count
      const { count: hostedCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("host_id", id);

      // Get attended events count
      const { count: attendedCount } = await supabase
        .from("event_attendees")
        .select("*", { count: "exact", head: true })
        .eq("user_id", id)
        .eq("status", "approved");

      // Check friendship status
      const { data: friendshipData } = await supabase
        .from("friendships")
        .select("status")
        .or(
          `and(user_id.eq.${user?.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user?.id})`
        )
        .maybeSingle();

      // Get recent events
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, description, event_date, icon")
        .eq("host_id", id)
        .order("event_date", { ascending: false })
        .limit(3);

      const userProfile: UserProfile = {
        id: profileData.id,
        name: profileData.name,
        bio: profileData.bio || "",
        interests: interestsData?.map((i) => i.interest) || [],
        hostedEvents: hostedCount || 0,
        attendedEvents: attendedCount || 0,
        mutualEvents: 0, // TODO: Calculate mutual events
        isFriend: friendshipData?.status === "accepted",
        friendshipStatus: friendshipData?.status || null,
        avatar_url: profileData.avatar_url,
      };

      setProfile(userProfile);
      setRecentEvents(eventsData || []);
      setLoading(false);
    } catch (error) {
      console.error("[UserProfile] Error in loadProfile:", error);
      Alert.alert("Error", "Failed to load user profile");
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!user || !profile) return;

    try {
      if (profile.isFriend) {
        Alert.alert("Already Friends", "You are already friends with this user");
        return;
      }

      if (profile.friendshipStatus === "pending") {
        Alert.alert(
          "Request Pending",
          "Your friend request is pending approval"
        );
        return;
      }

      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: profile.id,
        status: "pending",
      });

      if (error) {
        console.error("[UserProfile] Error sending friend request:", error);
        Alert.alert("Error", "Failed to send friend request");
        return;
      }

      Alert.alert("Success", "Friend request sent!");
      loadProfile(); // Reload to update status
    } catch (error) {
      console.error("[UserProfile] Error in handleAddFriend:", error);
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  const handleMessage = () => {
    if (!profile) return;
    console.log("[UserProfile] Starting chat with user:", profile.id);
    router.push(`/direct-message/${profile.id}` as any);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
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
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.avatarGradient}
            >
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <IconSymbol name="person.fill" size={48} color={colors.text} />
                </View>
              )}
            </LinearGradient>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable style={styles.primaryButton} onPress={handleMessage}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.primaryButtonGradient}
              >
                <IconSymbol name="message.fill" size={16} color={colors.text} />
                <Text style={styles.primaryButtonText}>Message</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={handleAddFriend}
            >
              <IconSymbol
                name={profile.isFriend ? "person.fill.checkmark" : "person.badge.plus"}
                size={16}
                color={colors.primary}
              />
              <Text style={styles.secondaryButtonText}>
                {profile.isFriend
                  ? "Friends"
                  : profile.friendshipStatus === "pending"
                  ? "Pending"
                  : "Add Friend"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
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

        {/* Interests */}
        {profile.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsContainer}>
              {profile.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Events</Text>
            {recentEvents.map((event) => (
              <Pressable
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/event/${event.id}` as any)}
              >
                <LinearGradient
                  colors={[
                    "rgba(187, 134, 252, 0.1)",
                    "rgba(3, 218, 198, 0.1)",
                  ]}
                  style={styles.eventCardGradient}
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
                  <IconSymbol
                    name="chevron.right"
                    size={20}
                    color={colors.textSecondary}
                  />
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        )}
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
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
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
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
});
