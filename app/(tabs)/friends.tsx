
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/styles/commonStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { useRouter } from "expo-router";
import { supabase } from "@/app/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

interface Friend {
  id: string;
  name: string;
  bio: string;
  mutualEvents: number;
  interests: string[];
}

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFriends();
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log("Loading friends");

      // Get accepted friendships
      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from("friendships")
        .select(`
          friend_id,
          profiles!friendships_friend_id_fkey(
            id,
            name,
            bio
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "accepted");

      if (friendshipsError) throw friendshipsError;

      // Also get friendships where user is the friend
      const { data: reverseFriendshipsData, error: reverseError } =
        await supabase
          .from("friendships")
          .select(`
          user_id,
          profiles!friendships_user_id_fkey(
            id,
            name,
            bio
          )
        `)
          .eq("friend_id", user.id)
          .eq("status", "accepted");

      if (reverseError) throw reverseError;

      // Combine and format friends
      const allFriendIds = new Set<string>();
      const friendsMap = new Map<string, any>();

      (friendshipsData || []).forEach((item) => {
        if (item.profiles) {
          const profile = item.profiles as any;
          allFriendIds.add(profile.id);
          friendsMap.set(profile.id, profile);
        }
      });

      (reverseFriendshipsData || []).forEach((item) => {
        if (item.profiles) {
          const profile = item.profiles as any;
          allFriendIds.add(profile.id);
          friendsMap.set(profile.id, profile);
        }
      });

      // Get interests for each friend
      const friendsWithInterests = await Promise.all(
        Array.from(allFriendIds).map(async (friendId) => {
          const profile = friendsMap.get(friendId);

          // Get interests
          const { data: interestsData } = await supabase
            .from("interests")
            .select("interest")
            .eq("user_id", friendId)
            .limit(5);

          // Count mutual events (simplified)
          const { count: mutualCount } = await supabase
            .from("event_attendees")
            .select("event_id", { count: "exact", head: true })
            .eq("user_id", friendId)
            .in(
              "event_id",
              await supabase
                .from("event_attendees")
                .select("event_id")
                .eq("user_id", user.id)
                .then((res) => res.data?.map((e) => e.event_id) || [])
            );

          return {
            id: profile.id,
            name: profile.name,
            bio: profile.bio || "No bio yet",
            mutualEvents: mutualCount || 0,
            interests:
              interestsData?.map((i) => i.interest.replace("#", "")) || [],
          };
        })
      );

      setFriends(friendsWithInterests);
    } catch (error: any) {
      console.error("Error loading friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatPress = (friend: Friend) => {
    console.log("Opening chat with:", friend.name);
    // For now, we'll navigate to their profile since direct messaging isn't implemented
    router.push(`/user-profile/${friend.id}` as any);
  };

  const handleProfilePress = (friend: Friend) => {
    console.log("Opening profile:", friend.name);
    router.push(`/user-profile/${friend.id}` as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          <Text style={styles.headerTitle}>Friends</Text>
          <Text style={styles.headerSubtitle}>
            {friends.length} connections
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <IconSymbol
            name="magnifyingglass"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredFriends.map((friend) => (
            <Pressable
              key={friend.id}
              style={styles.friendCard}
              onPress={() => handleProfilePress(friend)}
            >
              <View style={styles.friendAvatar}>
                <IconSymbol name="person.fill" size={28} color={colors.text} />
              </View>
              <View style={styles.friendContent}>
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.friendBio}>{friend.bio}</Text>
                <View style={styles.friendStats}>
                  <IconSymbol name="calendar" size={14} color={colors.primary} />
                  <Text style={styles.friendStatsText}>
                    {friend.mutualEvents} mutual events
                  </Text>
                </View>
                {friend.interests.length > 0 && (
                  <View style={styles.interestsContainer}>
                    {friend.interests.slice(0, 3).map((interest, index) => (
                      <View key={index} style={styles.interestTag}>
                        <Text style={styles.interestText}>#{interest}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Pressable
                style={styles.chatButton}
                onPress={() => handleChatPress(friend)}
              >
                <IconSymbol
                  name="message.fill"
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
            </Pressable>
          ))}

          {filteredFriends.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol
                name="person.2"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No friends found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? "Try a different search"
                  : "Connect with people at events"}
              </Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  friendCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.highlight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  friendContent: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  friendBio: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  friendStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  friendStatsText: {
    fontSize: 13,
    color: colors.primary,
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  interestTag: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestText: {
    fontSize: 12,
    color: colors.secondary,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
