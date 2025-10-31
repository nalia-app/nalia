
import React, { useState } from "react";
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

interface Event {
  id: string;
  hostName: string;
  description: string;
  date: string;
  time: string;
  attendees: number;
  icon: string;
  isHosting: boolean;
  tags: string[];
}

const MOCK_EVENTS: Event[] = [
  {
    id: "1",
    hostName: "You",
    description: "grab coffee and chat",
    date: "Today",
    time: "3:00 PM",
    attendees: 4,
    icon: "☕",
    isHosting: true,
    tags: ["#coffee", "#networking"],
  },
  {
    id: "2",
    hostName: "Anna",
    description: "grab a drink",
    date: "Tomorrow",
    time: "7:00 PM",
    attendees: 5,
    icon: "🍷",
    isHosting: false,
    tags: ["#drinks", "#social"],
  },
  {
    id: "3",
    hostName: "You",
    description: "morning yoga session",
    date: "Saturday",
    time: "8:00 AM",
    attendees: 7,
    icon: "🧘",
    isHosting: true,
    tags: ["#fitness", "#yoga"],
  },
];

export default function MyEventsScreen() {
  const [filter, setFilter] = useState<"all" | "hosting" | "attending">("all");

  const filteredEvents = MOCK_EVENTS.filter((event) => {
    if (filter === "hosting") return event.isHosting;
    if (filter === "attending") return !event.isHosting;
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Events</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <Pressable
          style={[
            styles.filterButton,
            filter === "all" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.filterButton,
            filter === "hosting" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("hosting")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "hosting" && styles.filterTextActive,
            ]}
          >
            Hosting
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.filterButton,
            filter === "attending" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("attending")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "attending" && styles.filterTextActive,
            ]}
          >
            Attending
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredEvents.map((event) => (
          <Pressable
            key={event.id}
            style={styles.eventCard}
            onPress={() =>
              Alert.alert(
                `${event.hostName} wanna...`,
                `${event.description}\n\nDate: ${event.date}\nTime: ${event.time}\nAttendees: ${event.attendees}`
              )
            }
          >
            <LinearGradient
              colors={["rgba(187, 134, 252, 0.1)", "rgba(3, 218, 198, 0.1)"]}
              style={styles.eventCardGradient}
            >
              <View style={styles.eventIcon}>
                <Text style={styles.eventIconText}>{event.icon}</Text>
              </View>
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventHost}>
                    {event.hostName} wanna...
                  </Text>
                  {event.isHosting && (
                    <View style={styles.hostBadge}>
                      <Text style={styles.hostBadgeText}>Host</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.eventDescription}>{event.description}</Text>
                <View style={styles.eventDetails}>
                  <View style={styles.eventDetailItem}>
                    <IconSymbol
                      name="calendar"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.eventDetailText}>{event.date}</Text>
                  </View>
                  <View style={styles.eventDetailItem}>
                    <IconSymbol
                      name="clock"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.eventDetailText}>{event.time}</Text>
                  </View>
                  <View style={styles.eventDetailItem}>
                    <IconSymbol
                      name="person.2"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.eventDetailText}>
                      {event.attendees}
                    </Text>
                  </View>
                </View>
                <View style={styles.tagsContainer}>
                  {event.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        ))}

        {filteredEvents.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol
              name="calendar.badge.exclamationmark"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>No events found</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === "hosting"
                ? "You're not hosting any events yet"
                : filter === "attending"
                ? "You're not attending any events yet"
                : "You don't have any events"}
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
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
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
  eventCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  eventCardGradient: {
    padding: 16,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  eventIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  eventIconText: {
    fontSize: 28,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  eventHost: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  hostBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text,
  },
  eventDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  eventDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  eventDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: colors.secondary,
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
