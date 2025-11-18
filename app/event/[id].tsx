
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { supabase } from "@/app/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

interface EventDetails {
  id: string;
  host_id: string;
  host_name: string;
  description: string;
  icon: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  event_date: string;
  event_time: string;
  is_public: boolean;
  is_recurring: boolean;
  recurrence_type: string | null;
  tags: string[];
  attendees: {
    id: string;
    user_id: string;
    status: string;
    profiles: {
      name: string;
      avatar_url: string | null;
    };
  }[];
  host_profile: {
    avatar_url: string | null;
  };
}

// Helper component to handle avatar image loading with fallback
const AvatarImage = ({ uri, size = 40 }: { uri: string | null; size?: number }) => {
  const [imageError, setImageError] = useState(false);
  
  // Check if URI is valid (Supabase URL)
  const isValidUri = uri && (uri.includes('supabase.co') || uri.includes('supabase.in'));
  
  if (!isValidUri || imageError) {
    return (
      <View style={[styles.attendeeAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <IconSymbol name="person.fill" size={size * 0.5} color={colors.text} />
      </View>
    );
  }
  
  return (
    <Image
      source={{ uri }}
      style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
      onError={() => setImageError(true)}
    />
  );
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAttending, setIsAttending] = useState(false);
  const [attendeeStatus, setAttendeeStatus] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [processingAttendeeId, setProcessingAttendeeId] = useState<string | null>(null);

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      console.log("[EventDetail] Loading event:", id);

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`
          *,
          attendees:event_attendees(
            id,
            user_id,
            status,
            profiles(name, avatar_url)
          ),
          host_profile:profiles!events_host_id_fkey(avatar_url)
        `)
        .eq("id", id)
        .single();

      if (eventError) throw eventError;

      setEvent(eventData);

      // Check if user is attending
      if (user) {
        const userAttendee = eventData.attendees.find(
          (a: any) => a.user_id === user.id
        );
        setIsAttending(!!userAttendee);
        setAttendeeStatus(userAttendee?.status || null);
      }
    } catch (error: any) {
      console.error("[EventDetail] Error loading event:", error);
      Alert.alert("Error", "Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to join events");
      return;
    }

    try {
      const status = event?.is_public ? "approved" : "pending";

      const { error } = await supabase.from("event_attendees").insert({
        event_id: id as string,
        user_id: user.id,
        status,
      });

      if (error) throw error;

      console.log("[EventDetail] Successfully joined event");

      // Create notification for host
      const notificationMessage = event?.is_public 
        ? `${user.name} joined "${event?.description}"`
        : `${user.name} wants to join "${event?.description}"`;

      await supabase.from("notifications").insert({
        user_id: event?.host_id,
        type: "event",
        title: event?.is_public ? "New Attendee" : "New Join Request",
        message: notificationMessage,
        related_id: id as string,
      });

      loadEvent();
    } catch (error: any) {
      console.error("[EventDetail] Error joining event:", error);
      Alert.alert("Error", "Failed to join event");
    }
  };

  const handleLeaveEvent = async () => {
    if (!user) return;

    Alert.alert("Leave Event", "Are you sure you want to leave this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("event_attendees")
              .delete()
              .eq("event_id", id as string)
              .eq("user_id", user.id);

            if (error) throw error;

            Alert.alert("Success", "You've left the event");
            loadEvent();
          } catch (error: any) {
            console.error("[EventDetail] Error leaving event:", error);
            Alert.alert("Error", "Failed to leave event");
          }
        },
      },
    ]);
  };

  const handleDeleteEvent = async () => {
    if (!user || !event) return;

    // Verify user is the host
    if (event.host_id !== user.id) {
      Alert.alert("Error", "Only the host can delete this event");
      return;
    }

    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              console.log("[EventDetail] Deleting event:", id);

              // Delete the event (RLS policy ensures only host can delete)
              const { error } = await supabase
                .from("events")
                .delete()
                .eq("id", id as string);

              if (error) throw error;

              console.log("[EventDetail] Event deleted successfully");
              Alert.alert("Success", "Event deleted successfully", [
                {
                  text: "OK",
                  onPress: () => {
                    // Navigate back to home or my events
                    router.back();
                  },
                },
              ]);
            } catch (error: any) {
              console.error("[EventDetail] Error deleting event:", error);
              Alert.alert("Error", "Failed to delete event. Please try again.");
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleApproveAttendee = async (attendeeId: string, userId: string, userName: string) => {
    try {
      setProcessingAttendeeId(attendeeId);
      console.log("[EventDetail] Approving attendee:", attendeeId);

      const { error } = await supabase
        .from("event_attendees")
        .update({ status: "approved" })
        .eq("id", attendeeId);

      if (error) throw error;

      // Send notification to the user
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "event",
        title: "Request Approved",
        message: `Your request to join "${event?.description}" has been approved!`,
        related_id: id as string,
      });

      console.log("[EventDetail] Attendee approved successfully");
      loadEvent();
    } catch (error: any) {
      console.error("[EventDetail] Error approving attendee:", error);
      Alert.alert("Error", "Failed to approve attendee");
    } finally {
      setProcessingAttendeeId(null);
    }
  };

  const handleDeclineAttendee = async (attendeeId: string, userId: string, userName: string) => {
    Alert.alert(
      "Decline Request",
      `Are you sure you want to decline ${userName}'s request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessingAttendeeId(attendeeId);
              console.log("[EventDetail] Declining attendee:", attendeeId);

              // Delete the attendee record
              const { error } = await supabase
                .from("event_attendees")
                .delete()
                .eq("id", attendeeId);

              if (error) throw error;

              // Send notification to the user
              await supabase.from("notifications").insert({
                user_id: userId,
                type: "event",
                title: "Request Declined",
                message: `Your request to join "${event?.description}" was declined.`,
                related_id: id as string,
              });

              console.log("[EventDetail] Attendee declined successfully");
              loadEvent();
            } catch (error: any) {
              console.error("[EventDetail] Error declining attendee:", error);
              Alert.alert("Error", "Failed to decline attendee");
            } finally {
              setProcessingAttendeeId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenChat = () => {
    if (!isAttending || attendeeStatus !== "approved") {
      Alert.alert("Info", "You must be an approved attendee to access the chat");
      return;
    }
    if (!id) {
      console.error("[EventDetail] ERROR: Event ID is undefined");
      return;
    }
    console.log("[EventDetail] Opening chat for event:", id);
    router.push(`/chat/${id}`);
  };

  const handleAttendeePress = (userId: string) => {
    if (!userId) {
      console.error("[EventDetail] ERROR: User ID is undefined");
      return;
    }
    console.log('[EventDetail] Opening profile for user:', userId);
    router.push(`/user-profile/${userId}`);
  };

  // Format time from hh:mm:ss to hh:mm
  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    // Split by colon and take only hours and minutes
    const parts = timeString.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeString;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  // Filter attendees by status
  const pendingAttendees = event.attendees.filter(
    (a) => a.status === "pending" && a.user_id !== event.host_id
  );
  const approvedAttendees = event.attendees.filter(
    (a) => a.status === "approved" && a.user_id !== event.host_id
  );
  const isHost = user?.id === event.host_id;
  
  // Total attendees including host
  const totalAttendees = approvedAttendees.length + 1;

  // Create host attendee object for display
  const hostAttendee = {
    id: 'host',
    user_id: event.host_id,
    status: 'approved',
    profiles: {
      name: event.host_name,
      avatar_url: event.host_profile?.avatar_url || null,
    }
  };

  // Combine host and attendees with host first
  const allApprovedAttendees = [hostAttendee, ...approvedAttendees];

  // Format description to always start with lowercase
  const formattedDescription = event.description.charAt(0).toLowerCase() + event.description.slice(1);

  return (
    <LinearGradient
      colors={[colors.background, "#0a0a0a"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Event Details</Text>
          {isHost && (
            <Pressable 
              style={styles.deleteButton} 
              onPress={handleDeleteEvent}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ff4444" />
              ) : (
                <IconSymbol name="trash" size={24} color="#ff4444" />
              )}
            </Pressable>
          )}
          {!isHost && <View style={styles.placeholder} />}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.eventHeader}>
            <View style={styles.eventIcon}>
              <Text style={styles.eventIconText}>{event.icon}</Text>
            </View>
            <Text style={styles.description}>
              <Text style={styles.hostNameText}>{event.host_name}</Text>
              <Text style={styles.wannaText}> wanna </Text>
              <Text style={styles.descriptionHighlight}>{formattedDescription}</Text>
            </Text>
            {isHost && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>You&apos;re hosting</Text>
              </View>
            )}
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <IconSymbol name="calendar" size={20} color={colors.primary} />
              <Text style={styles.detailText}>
                {new Date(event.event_date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <IconSymbol name="clock" size={20} color={colors.primary} />
              <Text style={styles.detailText}>{formatTime(event.event_time)}</Text>
            </View>
            <View style={styles.detailRow}>
              <IconSymbol name="location" size={20} color={colors.primary} />
              <Text style={styles.detailText}>
                {event.location_name || "Location set"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <IconSymbol
                name={event.is_public ? "globe" : "lock"}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.detailText}>
                {event.is_public ? "Public Event" : "Private Event"}
              </Text>
            </View>
            {event.is_recurring && (
              <View style={styles.detailRow}>
                <IconSymbol name="repeat" size={20} color={colors.primary} />
                <Text style={styles.detailText}>
                  Repeats {event.recurrence_type}
                </Text>
              </View>
            )}
          </View>

          {event.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {event.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isHost && pendingAttendees.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Pending Requests ({pendingAttendees.length})
                </Text>
                <View style={styles.pendingBadgeSmall}>
                  <Text style={styles.pendingBadgeSmallText}>{pendingAttendees.length}</Text>
                </View>
              </View>
              {pendingAttendees.map((attendee) => (
                <View key={attendee.id} style={styles.pendingAttendeeCard}>
                  <Pressable 
                    style={styles.pendingAttendeeInfo}
                    onPress={() => handleAttendeePress(attendee.user_id)}
                  >
                    <AvatarImage uri={attendee.profiles.avatar_url} size={40} />
                    <Text style={styles.attendeeName}>{attendee.profiles.name}</Text>
                  </Pressable>
                  <View style={styles.pendingActions}>
                    <Pressable
                      style={styles.approveButton}
                      onPress={() => handleApproveAttendee(attendee.id, attendee.user_id, attendee.profiles.name)}
                      disabled={processingAttendeeId === attendee.id}
                    >
                      {processingAttendeeId === attendee.id ? (
                        <ActivityIndicator size="small" color={colors.text} />
                      ) : (
                        <IconSymbol name="checkmark" size={20} color={colors.text} />
                      )}
                    </Pressable>
                    <Pressable
                      style={styles.declineButton}
                      onPress={() => handleDeclineAttendee(attendee.id, attendee.user_id, attendee.profiles.name)}
                      disabled={processingAttendeeId === attendee.id}
                    >
                      {processingAttendeeId === attendee.id ? (
                        <ActivityIndicator size="small" color="#ff4444" />
                      ) : (
                        <IconSymbol name="xmark" size={20} color="#ff4444" />
                      )}
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Attendees ({totalAttendees})
            </Text>
            {allApprovedAttendees.map((attendee, index) => (
              <Pressable 
                key={attendee.id} 
                style={styles.attendeeCard}
                onPress={() => handleAttendeePress(attendee.user_id)}
              >
                <AvatarImage uri={attendee.profiles.avatar_url} size={40} />
                <Text style={styles.attendeeName}>{attendee.profiles.name}</Text>
                {attendee.user_id === event.host_id && (
                  <View style={styles.hostTag}>
                    <Text style={styles.hostTagText}>Host</Text>
                  </View>
                )}
                <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>

          {isAttending && attendeeStatus === "approved" && (
            <Pressable style={styles.chatButton} onPress={handleOpenChat}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.chatButtonGradient}
              >
                <IconSymbol name="message.fill" size={20} color={colors.text} />
                <Text style={styles.chatButtonText}>Open Event Chat</Text>
              </LinearGradient>
            </Pressable>
          )}

          {!isHost && (
            <View style={styles.actionButtons}>
              {!isAttending ? (
                <Pressable style={styles.joinButton} onPress={handleJoinEvent}>
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={styles.joinButtonGradient}
                  >
                    <Text style={styles.joinButtonText}>
                      {event.is_public ? "Join Event" : "Request to Join"}
                    </Text>
                  </LinearGradient>
                </Pressable>
              ) : attendeeStatus === "pending" ? (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>Request Pending</Text>
                </View>
              ) : (
                <Pressable style={styles.leaveButton} onPress={handleLeaveEvent}>
                  <Text style={styles.leaveButtonText}>Leave Event</Text>
                </Pressable>
              )}
            </View>
          )}

          {isHost && (
            <View style={styles.actionButtons}>
              <Pressable 
                style={styles.deleteEventButton} 
                onPress={handleDeleteEvent}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ff4444" />
                ) : (
                  <>
                    <IconSymbol name="trash" size={20} color="#ff4444" />
                    <Text style={styles.deleteEventButtonText}>Delete Event</Text>
                  </>
                )}
              </Pressable>
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
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
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
  },
  deleteButton: {
    padding: 8,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  eventHeader: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  eventIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  eventIconText: {
    fontSize: 48,
  },
  description: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center",
    marginBottom: 16,
  },
  hostNameText: {
    color: colors.text,
  },
  wannaText: {
    color: colors.text,
  },
  descriptionHighlight: {
    color: colors.secondary,
  },
  hostBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hostBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  detailsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  detailText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  pendingBadgeSmall: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingBadgeSmallText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  tagText: {
    fontSize: 14,
    color: colors.secondary,
  },
  pendingAttendeeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pendingAttendeeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pendingActions: {
    flexDirection: "row",
    gap: 8,
  },
  approveButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  declineButton: {
    backgroundColor: colors.card,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  attendeeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  attendeeName: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  hostTag: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  hostTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  chatButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  chatButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  actionButtons: {
    paddingHorizontal: 20,
  },
  joinButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  joinButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  pendingBadge: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pendingText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  leaveButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff4444",
  },
  deleteEventButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  deleteEventButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff4444",
  },
});
