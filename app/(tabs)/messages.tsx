
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";

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
    eventName: "Coffee & Chat",
    hostName: "You",
    lastMessage: "See you all at 3pm!",
    timestamp: "10m ago",
    unread: 0,
    icon: "☕",
  },
  {
    id: "2",
    eventName: "Drinks Tonight",
    hostName: "Anna",
    lastMessage: "Anna: Should we meet at the bar?",
    timestamp: "1h ago",
    unread: 3,
    icon: "🍷",
  },
  {
    id: "3",
    eventName: "Morning Yoga",
    hostName: "You",
    lastMessage: "Tom: I'll bring extra mats",
    timestamp: "2h ago",
    unread: 1,
    icon: "🧘",
  },
];

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
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
            onPress={() =>
              Alert.alert(
                chat.eventName,
                `Open chat for "${chat.eventName}" event`
              )
            }
          >
            <LinearGradient
              colors={
                chat.unread > 0
                  ? ["rgba(255, 64, 129, 0.15)", "rgba(187, 134, 252, 0.15)"]
                  : ["rgba(187, 134, 252, 0.1)", "rgba(3, 218, 198, 0.1)"]
              }
              style={styles.chatCardGradient}
            >
              <View style={styles.chatIcon}>
                <Text style={styles.chatIconText}>{chat.icon}</Text>
                {chat.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{chat.unread}</Text>
                  </View>
                )}
              </View>
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatEventName}>{chat.eventName}</Text>
                  <Text style={styles.chatTimestamp}>{chat.timestamp}</Text>
                </View>
                <Text style={styles.chatHostName}>Host: {chat.hostName}</Text>
                <Text
                  style={[
                    styles.chatLastMessage,
                    chat.unread > 0 && styles.chatLastMessageUnread,
                  ]}
                  numberOfLines={1}
                >
                  {chat.lastMessage}
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

        {MOCK_CHATS.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              name="message.badge"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>No messages yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Join an event to start chatting with attendees
            </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
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
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  chatCardGradient: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  chatIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    position: "relative",
  },
  chatIconText: {
    fontSize: 28,
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
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
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  chatTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chatHostName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  chatLastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  chatLastMessageUnread: {
    color: colors.text,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
});
