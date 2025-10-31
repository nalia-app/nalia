
import React from "react";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { useRouter } from "expo-router";

interface Chat {
  id: string;
  eventName: string;
  hostName: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  icon: string;
}

const MOCK_CHATS: Chat[] = [
  {
    id: "1",
    eventName: "Coffee Meetup",
    hostName: "Sarah",
    lastMessage: "See you at 3pm!",
    timestamp: "2m ago",
    unread: 2,
    icon: "☕",
  },
  {
    id: "2",
    eventName: "Basketball Game",
    hostName: "Mike",
    lastMessage: "Bring your own ball",
    timestamp: "1h ago",
    unread: 0,
    icon: "🏀",
  },
  {
    id: "3",
    eventName: "Drinks Tonight",
    hostName: "Anna",
    lastMessage: "Who's coming?",
    timestamp: "3h ago",
    unread: 5,
    icon: "🍷",
  },
];

export default function MessagesScreen() {
  const router = useRouter();

  const handleChatPress = (chat: Chat) => {
    console.log("Opening chat:", chat.id);
    router.push(`/chat/${chat.id}` as any);
  };

  return (
    <LinearGradient colors={[colors.background, "#0a0a0a"]} style={styles.container}>
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
          {MOCK_CHATS.map((chat) => (
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
                  <Text style={styles.chatEventName}>{chat.eventName}</Text>
                  <Text style={styles.chatTimestamp}>{chat.timestamp}</Text>
                </View>
                <Text style={styles.chatHostName}>Host: {chat.hostName}</Text>
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

          {MOCK_CHATS.length === 0 && (
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
