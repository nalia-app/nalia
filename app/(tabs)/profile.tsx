
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Share,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/app/integrations/supabase/client";

interface RecentEvent {
  id: string;
  description: string;
  event_date: string;
  icon: string;
}

// Helper function to capitalize first letter of each word
const capitalizeInterest = (interest: string): string => {
  return interest
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useUser();
  const [hostedCount, setHostedCount] = useState(0);
  const [attendedCount, setAttendedCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddInterest, setShowAddInterest] = useState(false);
  const [newInterest, setNewInterest] = useState("");

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load hosted events count
      const { count: hosted } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("host_id", user.id);

      setHostedCount(hosted || 0);

      // Load attended events count
      const { count: attended } = await supabase
        .from("event_attendees")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "approved");

      setAttendedCount(attended || 0);

      // Load friends count
      const { count: friends } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      setFriendsCount(friends || 0);

      // Load recent events (both hosted and attended)
      const { data: hostedEvents } = await supabase
        .from("events")
        .select("id, description, event_date, icon")
        .eq("host_id", user.id)
        .order("event_date", { ascending: false })
        .limit(3);

      const { data: attendedEventIds } = await supabase
        .from("event_attendees")
        .select("event_id")
        .eq("user_id", user.id)
        .eq("status", "approved");

      if (attendedEventIds && attendedEventIds.length > 0) {
        const eventIds = attendedEventIds.map((e) => e.event_id);
        const { data: attendedEvents } = await supabase
          .from("events")
          .select("id, description, event_date, icon")
          .in("id", eventIds)
          .order("event_date", { ascending: false })
          .limit(3);

        // Combine and deduplicate events
        const allEvents = [...(hostedEvents || []), ...(attendedEvents || [])];
        const uniqueEvents = Array.from(
          new Map(allEvents.map((e) => [e.id, e])).values()
        )
          .sort(
            (a, b) =>
              new Date(b.event_date).getTime() -
              new Date(a.event_date).getTime()
          )
          .slice(0, 3);

        setRecentEvents(uniqueEvents);
      } else {
        setRecentEvents(hostedEvents || []);
      }

      // Load interests
      const { data: interestsData } = await supabase
        .from("interests")
        .select("interest")
        .eq("user_id", user.id);

      setInterests(interestsData?.map((i) => i.interest) || []);
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInterest = async () => {
    const trimmedInterest = newInterest.trim();
    if (!trimmedInterest || !user) return;

    const capitalizedInterest = capitalizeInterest(trimmedInterest);

    try {
      const { error } = await supabase.from("interests").insert({
        user_id: user.id,
        interest: capitalizedInterest,
      });

      if (error) throw error;

      setInterests([...interests, capitalizedInterest]);
      setNewInterest("");
      setShowAddInterest(false);
      Alert.alert("Success", "Interest added successfully");
    } catch (error: any) {
      console.error("Error adding interest:", error);
      Alert.alert("Error", "Failed to add interest");
    }
  };

  const handleDeleteInterest = async (interest: string) => {
    if (!user) return;

    Alert.alert(
      "Delete Interest",
      `Are you sure you want to remove "${interest}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("interests")
                .delete()
                .eq("user_id", user.id)
                .eq("interest", interest);

              if (error) throw error;

              setInterests(interests.filter((i) => i !== interest));
              Alert.alert("Success", "Interest removed successfully");
            } catch (error: any) {
              console.error("Error deleting interest:", error);
              Alert.alert("Error", "Failed to remove interest");
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push("/edit-profile" as any);
  };

  const handleSettings = () => {
    router.push("/settings" as any);
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${
          user?.name || "my"
        } profile on Nalia! Join me for spontaneous meetups and events.`,
        title: "Share Profile",
      });
    } catch (error) {
      console.error("Error sharing profile:", error);
      Alert.alert("Error", "Could not share profile");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          console.log("Logging out user...");
          await logout();
          console.log("User logged out, navigating to onboarding...");
          router.replace("/onboarding/" as any);
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Pressable style={styles.settingsButton} onPress={handleSettings}>
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
                <Image
                  source={{ uri: user.photoUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <IconSymbol
                    name="person.fill"
                    size={48}
                    color={colors.text}
                  />
                </View>
              )}
            </LinearGradient>
          </View>
          <Text style={styles.name}>{user?.name || "User"}</Text>
          <Text style={styles.bio}>{user?.bio || "No bio yet"}</Text>
          <Pressable style={styles.editButton} onPress={handleEditProfile}>
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
            <Text style={styles.statValue}>{hostedCount}</Text>
            <Text style={styles.statLabel}>Hosted</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{attendedCount}</Text>
            <Text style={styles.statLabel}>Attended</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{friendsCount}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
        </View>

        {/* Interests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => setShowAddInterest(true)}
            >
              <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.interestsContainer}>
            {interests.map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
                <Pressable
                  style={styles.deleteInterestButton}
                  onPress={() => handleDeleteInterest(interest)}
                >
                  <IconSymbol name="xmark.circle.fill" size={18} color={colors.accent} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Events</Text>
          {recentEvents.length > 0 ? (
            recentEvents.map((event) => (
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
            ))
          ) : (
            <Text style={styles.noEventsText}>No recent events</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable style={styles.actionButton} onPress={handleShareProfile}>
            <IconSymbol
              name="square.and.arrow.up"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.actionButtonText}>Share Profile</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleLogout}>
            <IconSymbol
              name="arrow.right.square"
              size={20}
              color={colors.accent}
            />
            <Text style={[styles.actionButtonText, { color: colors.accent }]}>
              Logout
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Add Interest Modal */}
      <Modal
        visible={showAddInterest}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddInterest(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Interest</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter interest..."
              placeholderTextColor={colors.textSecondary}
              value={newInterest}
              onChangeText={setNewInterest}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddInterest(false);
                  setNewInterest("");
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonAdd]}
                onPress={handleAddInterest}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonText}>Add</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  addButton: {
    padding: 4,
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  interestText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  deleteInterestButton: {
    padding: 2,
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
  noEventsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: colors.highlight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalButtonCancel: {
    backgroundColor: colors.highlight,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalButtonAdd: {
    overflow: "hidden",
  },
  modalButtonGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
});
