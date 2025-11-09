
import React, { useState, useEffect, useRef } from "react";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { useRouter } from "expo-router";
import { supabase } from "@/app/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Chat {
  id: string;
  event_id?: string;
  other_user_id?: string;
  event_name?: string;
  other_user_name?: string;
  host_name?: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  icon?: string;
  type: 'event' | 'direct';
}

type FilterType = 'all' | 'events' | 'chats';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (user) {
      loadChats();
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
      .channel(`messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          console.log('New event message received');
          loadChats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        () => {
          console.log('New direct message received');
          loadChats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Message read status updated');
          loadChats();
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const loadChats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log("Loading chats");

      const eventChats: Chat[] = [];
      const directChats: Chat[] = [];

      // Load event chats
      const { data: attendeeData, error: attendeeError } = await supabase
        .from("event_attendees")
        .select(`
          event_id,
          events(
            id,
            description,
            host_name,
            icon
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "approved");

      if (attendeeError) throw attendeeError;

      // For each event, get the last message and unread count
      const eventChatsPromises = (attendeeData || []).map(async (item) => {
        if (!item.events) return null;

        const event = item.events as any;

        const { data: lastMessage } = await supabase
          .from("messages")
          .select("*")
          .eq("event_id", event.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Count unread messages (messages not in message_reads for this user)
        const { data: allMessages } = await supabase
          .from("messages")
          .select("id")
          .eq("event_id", event.id)
          .neq("sender_id", user.id);

        let unreadCount = 0;
        if (allMessages && allMessages.length > 0) {
          const messageIds = allMessages.map((m) => m.id);
          
          const { data: readMessages } = await supabase
            .from("message_reads")
            .select("message_id")
            .eq("user_id", user.id)
            .in("message_id", messageIds);

          const readMessageIds = new Set(readMessages?.map((r) => r.message_id) || []);
          unreadCount = messageIds.filter((id) => !readMessageIds.has(id)).length;
        }

        return {
          id: event.id,
          event_id: event.id,
          event_name: event.description,
          host_name: event.host_name,
          lastMessage: lastMessage?.text || "No messages yet",
          timestamp: lastMessage
            ? formatTimestamp(lastMessage.created_at)
            : "New",
          unread: unreadCount,
          icon: event.icon,
          type: 'event' as const,
        };
      });

      const eventChatsData = await Promise.all(eventChatsPromises);
      eventChats.push(...(eventChatsData.filter((chat) => chat !== null) as Chat[]));

      // Load direct message chats
      const { data: directMessagesData, error: dmError } = await supabase
        .from("direct_messages")
        .select(`
          id,
          sender_id,
          receiver_id,
          text,
          created_at,
          read
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (dmError) throw dmError;

      // Group by conversation partner
      const conversationsMap = new Map<string, any[]>();
      
      (directMessagesData || []).forEach((msg) => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, []);
        }
        conversationsMap.get(otherUserId)!.push(msg);
      });

      // Create chat objects for each conversation
      const directChatsPromises = Array.from(conversationsMap.entries()).map(
        async ([otherUserId, messages]) => {
          const { data: otherUserProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", otherUserId)
            .single();

          const lastMessage = messages[0];
          const unreadCount = messages.filter(
            (m) => m.receiver_id === user.id && !m.read
          ).length;

          return {
            id: `dm-${otherUserId}`,
            other_user_id: otherUserId,
            other_user_name: otherUserProfile?.name || "Unknown",
            lastMessage: lastMessage.text,
            timestamp: formatTimestamp(lastMessage.created_at),
            unread: unreadCount,
            type: 'direct' as const,
          };
        }
      );

      const directChatsData = await Promise.all(directChatsPromises);
      directChats.push(...directChatsData);

      // Combine and sort all chats
      const allChats = [...eventChats, ...directChats];
      allChats.sort((a, b) => {
        if (a.timestamp === "New") return -1;
        if (b.timestamp === "New") return 1;
        if (a.timestamp === "Just now") return -1;
        if (b.timestamp === "Just now") return 1;
        return 0;
      });

      setChats(allChats);
    } catch (error: any) {
      console.error("Error loading chats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleChatPress = (chat: Chat) => {
    console.log("Opening chat:", chat.id);
    if (chat.type === 'event') {
      router.push(`/chat/${chat.event_id}` as any);
    } else {
      router.push(`/direct-message/${chat.other_user_id}` as any);
    }
  };

  const filteredChats = chats.filter((chat) => {
    if (filter === 'all') return true;
    if (filter === 'events') return chat.type === 'event';
    if (filter === 'chats') return chat.type === 'direct';
    return true;
  });

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
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            {chats.filter(c => c.unread > 0).length > 0 
              ? `${chats.filter(c => c.unread > 0).length} unread`
              : 'All caught up'}
          </Text>
        </View>

        {/* Filter Toggle */}
        <View style={styles.filterContainer}>
          <Pressable
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, filter === 'events' && styles.filterButtonActive]}
            onPress={() => setFilter('events')}
          >
            <Text style={[styles.filterText, filter === 'events' && styles.filterTextActive]}>
              Events
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, filter === 'chats' && styles.filterButtonActive]}
            onPress={() => setFilter('chats')}
          >
            <Text style={[styles.filterText, filter === 'chats' && styles.filterTextActive]}>
              Chats
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredChats.map((chat) => (
            <Pressable
              key={chat.id}
              style={[styles.chatCard, chat.unread > 0 && styles.chatCardUnread]}
              onPress={() => handleChatPress(chat)}
            >
              <View style={styles.chatIcon}>
                {chat.type === 'event' ? (
                  <Text style={styles.chatIconText}>{chat.icon}</Text>
                ) : (
                  <IconSymbol name="person.fill" size={28} color={colors.text} />
                )}
              </View>
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatEventName}>
                    {chat.type === 'event' ? chat.event_name : chat.other_user_name}
                  </Text>
                  <Text style={styles.chatTimestamp}>{chat.timestamp}</Text>
                </View>
                {chat.type === 'event' && (
                  <Text style={styles.chatHostName}>Host: {chat.host_name}</Text>
                )}
                <Text style={styles.chatLastMessage} numberOfLines={1}>
                  {chat.lastMessage}
                </Text>
              </View>
              {chat.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{chat.unread}</Text>
                </View>
              )}
            </Pressable>
          ))}

          {filteredChats.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol name="message" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No messages</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'events' 
                  ? 'Join an event to start chatting'
                  : filter === 'chats'
                  ? 'Start a conversation with someone'
                  : 'Join an event or message someone'}
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.highlight,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  chatCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  chatCardUnread: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  chatIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.highlight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chatIconText: {
    fontSize: 28,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatEventName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  chatTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chatHostName: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 4,
  },
  chatLastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: "bold",
    color: '#FFFFFF',
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
