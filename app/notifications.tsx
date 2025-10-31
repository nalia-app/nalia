
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";

interface Notification {
  id: string;
  type: "event" | "friend" | "message";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "event",
    title: "New Event Nearby",
    message: "Anna created 'Coffee Meetup' near you",
    timestamp: "5m ago",
    read: false,
  },
  {
    id: "2",
    type: "friend",
    title: "Friend Request",
    message: "Tom Wilson wants to connect",
    timestamp: "1h ago",
    read: false,
  },
  {
    id: "3",
    type: "message",
    title: "New Message",
    message: "Sarah: 'See you at 3pm!'",
    timestamp: "2h ago",
    read: true,
  },
  {
    id: "4",
    type: "event",
    title: "Event Starting Soon",
    message: "Basketball Game starts in 30 minutes",
    timestamp: "3h ago",
    read: true,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();

  const getIconName = (type: string) => {
    switch (type) {
      case "event":
        return "calendar";
      case "friend":
        return "person.2.fill";
      case "message":
        return "message.fill";
      default:
        return "bell.fill";
    }
  };

  return (
    <LinearGradient colors={[colors.background, "#0a0a0a"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Pressable style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {MOCK_NOTIFICATIONS.map((notification) => (
            <Pressable
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.read && styles.notificationCardUnread,
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  !notification.read && styles.iconContainerUnread,
                ]}
              >
                <IconSymbol
                  name={getIconName(notification.type) as any}
                  size={24}
                  color={notification.read ? colors.textSecondary : colors.primary}
                />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationTimestamp}>
                  {notification.timestamp}
                </Text>
              </View>
              {!notification.read && <View style={styles.unreadDot} />}
            </Pressable>
          ))}

          {MOCK_NOTIFICATIONS.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol name="bell" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No notifications</Text>
              <Text style={styles.emptySubtext}>
                You&apos;re all caught up!
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
    flex: 1,
    textAlign: "center",
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  notificationCardUnread: {
    borderColor: colors.primary,
    backgroundColor: "rgba(187, 134, 252, 0.05)",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconContainerUnread: {
    backgroundColor: "rgba(187, 134, 252, 0.2)",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 8,
    marginTop: 4,
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
