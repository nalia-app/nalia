
import React, { useState, useEffect } from "react";
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

interface Chat {
  id: string;
  event_id: string;
  event_name: string;
  host_name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  icon: string;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  const loadChats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log("Loading chats");

      // Get events where user is an approved attendee
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

      // For each event, get the last message
      const chatsPromises = (attendeeData || []).map(async (item) => {
        if (!item.events) return null;

        const event = item.events as any;

        const { data: lastMessage } = await supabase
          .from("messages")
          .select("*")
          .eq("event_id", event.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Count unread messages (simplified - you could add a read_by field)
        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id)
          .neq("sender_id", user.id)
          .gte(
            "created_at",
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          );

        return {
          id: event.id,
          event_id: event.id,
          event_name: event.description,
          host_name: event.host_name,
          lastMessage: lastMessage?.text || "No messages yet",
          timestamp: lastMessage
            ? formatTimestamp(lastMessage.created_at)
            : "New",
          unread: unreadCount || 0,
          icon: event.icon,
        };
      });

      const chatsData = await Promise.all(chatsPromises);
      const validChats = chatsData.filter((chat) => chat !== null) as Chat[];

      // Sort by most recent
      validChats.sort((a, b) => {
        if (a.timestamp === "New") return -1;
        if (b.timestamp === "New") return 1;
        return 0;
      });

      setChats(validChats);
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
    router.push(`/chat/${chat.event_id}` as any);
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
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>Event Chats</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {chats.map((chat) => (
            <Pressable
              key={chat.id}
              style={styles.chatCard}
              onPress={() => handleChatPress(chat)}
            >
              <View style={styles.chatIcon}>
                <Text style={styles.chatIconText}>{chat.icon}</Text>
              </View>
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatEventName}>{chat.event_name}</Text>
                  <Text style={styles.chatTimestamp}>{chat.timestamp}</Text>
                </View>
                <Text style={styles.chatHostName}>Host: {chat.host_name}</Text>
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

          {chats.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol name="message" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No active chats</Text>
              <Text style={styles.emptySubtext}>
                Join an event to start chatting
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
    backgroundColor: colors.accent,
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
