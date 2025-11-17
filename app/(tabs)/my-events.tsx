
import React, { useState, useEffect, useCallback } from "react";
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
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/app/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

interface Event {
  id: string;
  host_id: string;
  host_name: string;
  description: string;
  event_date: string;
  event_time: string;
  icon: string;
  tags: string[];
  attendees: number;
  isHosting: boolean;
}

export default function MyEventsScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "hosting" | "attending">("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log("[MyEventsScreen] Loading user events");

      // Get events where user is host
      const { data: hostedEvents, error: hostedError } = await supabase
        .from("events")
        .select("*")
        .eq("host_id", user.id)
        .order("event_date", { ascending: true });

      if (hostedError) throw hostedError;

      // Get events where user is attending
      const { data: attendingData, error: attendingError } = await supabase
        .from("event_attendees")
        .select(`
          event_id,
          status,
          events(*)
        `)
        .eq("user_id", user.id)
        .eq("status", "approved")
        .neq("events.host_id", user.id);

      if (attendingError) throw attendingError;

      // Get attendee counts for hosted events
      const hostedEventsWithCounts = await Promise.all(
        (hostedEvents || []).map(async (event) => {
          const { count } = await supabase
            .from('event_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'approved');

          const attendeeCount = count || 0;
          console.log(`[MyEventsScreen] Hosted event "${event.description}" has ${attendeeCount} attendees`);

          return {
            id: event.id,
            host_id: event.host_id,
            host_name: event.host_name,
            description: event.description,
            event_date: event.event_date,
            event_time: event.event_time,
            icon: event.icon,
            tags: event.tags || [],
            attendees: attendeeCount,
            isHosting: true,
          };
        })
      );

      // Get attendee counts for attending events
      const attendingEventsWithCounts = await Promise.all(
        (attendingData || [])
          .filter((item) => item.events)
          .map(async (item) => {
            const event = item.events as any;
            
            const { count } = await supabase
              .from('event_attendees')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .eq('status', 'approved');

            const attendeeCount = count || 0;
            console.log(`[MyEventsScreen] Attending event "${event.description}" has ${attendeeCount} attendees`);

            return {
              id: event.id,
              host_id: event.host_id,
              host_name: event.host_name,
              description: event.description,
              event_date: event.event_date,
              event_time: event.event_time,
              icon: event.icon,
              tags: event.tags || [],
              attendees: attendeeCount,
              isHosting: false,
            };
          })
      );

      // Combine and sort
      const allEvents = [...hostedEventsWithCounts, ...attendingEventsWithCounts].sort(
        (a, b) =>
          new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );

      console.log(`[MyEventsScreen] Loaded ${allEvents.length} events with attendee counts`);
      setEvents(allEvents);
    } catch (error: any) {
      console.error("[MyEventsScreen] Error loading events:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load events when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("[MyEventsScreen] Screen focused, reloading events");
      if (user) {
        loadEvents();
      }
    }, [user, loadEvents])
  );

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    console.log("[MyEventsScreen] Setting up realtime subscriptions");

    // Subscribe to event_attendees changes
    const attendeesChannel = supabase
      .channel('my-events-attendees')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees'
        },
        (payload) => {
          console.log('[MyEventsScreen] Attendee change detected:', payload);
          loadEvents();
        }
      )
      .subscribe();

    // Subscribe to events changes
    const eventsChannel = supabase
      .channel('my-events-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          console.log('[MyEventsScreen] Event change detected:', payload);
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      console.log('[MyEventsScreen] Cleaning up subscriptions');
      supabase.removeChannel(attendeesChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [user, loadEvents]);

  const filteredEvents = events.filter((event) => {
    if (filter === "hosting") return event.isHosting;
    if (filter === "attending") return !event.isHosting;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/event/${eventId}` as any);
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
            onPress={() => handleEventPress(event.id)}
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
                  <Text style={styles.eventTitle}>
                    <Text style={styles.eventHost}>{event.host_name}</Text>
                    <Text style={styles.eventWanna}> wanna </Text>
                    <Text style={styles.eventAction}>
                      {event.description.charAt(0).toLowerCase() + event.description.slice(1)}
                    </Text>
                  </Text>
                  {event.isHosting && (
                    <View style={styles.hostBadge}>
                      <Text style={styles.hostBadgeText}>Host</Text>
                    </View>
                  )}
                </View>
                <View style={styles.eventDetails}>
                  <View style={styles.eventDetailItem}>
                    <IconSymbol
                      name="calendar"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.eventDetailText}>
                      {formatDate(event.event_date)}
                    </Text>
                  </View>
                  <View style={styles.eventDetailItem}>
                    <IconSymbol
                      name="clock"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.eventDetailText}>{event.event_time}</Text>
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
                {event.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {event.tags.slice(0, 3).map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    lineHeight: 22,
  },
  eventHost: {
    color: colors.text,
  },
  eventWanna: {
    color: colors.text,
  },
  eventAction: {
    color: colors.secondary,
  },
  hostBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text,
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
