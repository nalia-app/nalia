
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/styles/commonStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { useRouter } from "expo-router";
import { supabase } from "@/app/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Friend {
  id: string;
  name: string;
  bio: string;
  mutualEvents: number;
  interests: string[];
  avatar_url: string | null;
}

interface FriendRequest {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
}

type TabType = 'friends' | 'requests';

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (user) {
      loadFriends();
      loadRequests();
      setupRealtimeSubscription();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user]);

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel(`friendships-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${user.id}`,
        },
        () => {
          console.log('Friendship change detected');
          loadFriends();
          loadRequests();
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const loadRequests = async () => {
    if (!user) return;

    try {
      console.log("Loading friend requests");

      // Get pending friend requests where user is the friend (receiver)
      const { data: requestsData, error: requestsError } = await supabase
        .from("friendships")
        .select(`
          id,
          user_id,
          created_at,
          profiles!friendships_user_id_fkey(
            id,
            name,
            bio,
            avatar_url
          )
        `)
        .eq("friend_id", user.id)
        .eq("status", "pending");

      if (requestsError) throw requestsError;

      const formattedRequests = (requestsData || []).map((req) => {
        const profile = req.profiles as any;
        return {
          id: req.id,
          user_id: req.user_id,
          name: profile.name,
          bio: profile.bio || "No bio yet",
          avatar_url: profile.avatar_url,
          created_at: req.created_at,
        };
      });

      setRequests(formattedRequests);
      console.log('Loaded friend requests:', formattedRequests.length);
    } catch (error: any) {
      console.error("Error loading friend requests:", error);
    }
  };

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
            bio,
            avatar_url
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
            bio,
            avatar_url
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
          const { data: myEvents } = await supabase
            .from("event_attendees")
            .select("event_id")
            .eq("user_id", user.id);

          const myEventIds = myEvents?.map((e) => e.event_id) || [];

          let mutualCount = 0;
          if (myEventIds.length > 0) {
            const { count } = await supabase
              .from("event_attendees")
              .select("event_id", { count: "exact", head: true })
              .eq("user_id", friendId)
              .in("event_id", myEventIds);
            mutualCount = count || 0;
          }

          return {
            id: profile.id,
            name: profile.name,
            bio: profile.bio || "No bio yet",
            mutualEvents: mutualCount,
            interests:
              interestsData?.map((i) => i.interest.replace("#", "")) || [],
            avatar_url: profile.avatar_url,
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

  const handleAcceptRequest = async (requestId: string, userId: string) => {
    try {
      console.log("Accepting friend request:", requestId);

      // Update the friendship status
      const { error: updateError } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Create notification for the requester
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "friend",
        title: "Friend Request Accepted",
        message: `${user?.name} accepted your friend request`,
        related_id: user?.id,
      });

      Alert.alert("Success", "Friend request accepted!");
      
      // Reload both friends and requests to update the UI and badge
      await Promise.all([loadFriends(), loadRequests()]);
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", "Failed to accept friend request");
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      console.log("Declining friend request:", requestId);

      // Delete the friendship
      const { error: deleteError } = await supabase
        .from("friendships")
        .delete()
        .eq("id", requestId);

      if (deleteError) throw deleteError;

      Alert.alert("Success", "Friend request declined");
      
      // Reload requests to update the UI and badge
      await loadRequests();
    } catch (error: any) {
      console.error("Error declining friend request:", error);
      Alert.alert("Error", "Failed to decline friend request");
    }
  };

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatPress = (friend: Friend) => {
    console.log("Opening chat with:", friend.name);
    router.push(`/direct-message/${friend.id}` as any);
  };

  const handleProfilePress = (userId: string) => {
    console.log("Opening profile:", userId);
    router.push(`/user-profile/${userId}` as any);
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
            {friends.length} friends
            {requests.length > 0 && ` • ${requests.length} pending`}
          </Text>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'friends' && styles.tabButtonActive]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
              Friends
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'requests' && styles.tabButtonActive]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
              Requests
            </Text>
            {requests.length > 0 && (
              <View style={styles.requestBadge}>
                <Text style={styles.requestBadgeText}>{requests.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {activeTab === 'friends' && (
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
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'friends' ? (
            <>
              {filteredFriends.map((friend) => (
                <Pressable
                  key={friend.id}
                  style={styles.friendCard}
                  onPress={() => handleProfilePress(friend.id)}
                >
                  <View style={styles.friendAvatar}>
                    {friend.avatar_url ? (
                      <Image source={{ uri: friend.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <IconSymbol name="person.fill" size={28} color={colors.text} />
                    )}
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
            </>
          ) : (
            <>
              {requests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.friendAvatar}>
                    {request.avatar_url ? (
                      <Image source={{ uri: request.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <IconSymbol name="person.fill" size={28} color={colors.text} />
                    )}
                  </View>
                  <View style={styles.requestContent}>
                    <Text style={styles.friendName}>{request.name}</Text>
                    <Text style={styles.friendBio}>{request.bio}</Text>
                    <View style={styles.requestActions}>
                      <Pressable
                        style={styles.acceptButton}
                        onPress={() => handleAcceptRequest(request.id, request.user_id)}
                      >
                        <IconSymbol name="checkmark" size={18} color="#FFFFFF" />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </Pressable>
                      <Pressable
                        style={styles.declineButton}
                        onPress={() => handleDeclineRequest(request.id)}
                      >
                        <IconSymbol name="xmark" size={18} color={colors.text} />
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}

              {requests.length === 0 && (
                <View style={styles.emptyState}>
                  <IconSymbol
                    name="person.badge.plus"
                    size={64}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.emptyText}>No pending requests</Text>
                  <Text style={styles.emptySubtext}>
                    Friend requests will appear here
                  </Text>
                </View>
              )}
            </>
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.highlight,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
  },
  requestBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  requestCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "flex-start",
    borderWidth: 2,
    borderColor: colors.primary,
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  friendContent: {
    flex: 1,
  },
  requestContent: {
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
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
    gap: 6,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
