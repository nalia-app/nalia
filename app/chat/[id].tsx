
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { supabase } from "@/app/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
  isMe: boolean;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [eventName, setEventName] = useState("Event Chat");
  const [participantCount, setParticipantCount] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (user && id) {
      loadEventDetails();
      loadMessages();
      setupRealtimeSubscription();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [id, user]);

  const loadEventDetails = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("description")
        .eq("id", id)
        .single();

      if (eventError) throw eventError;

      setEventName(eventData.description);

      // Count participants
      const { count } = await supabase
        .from("event_attendees")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "approved");

      setParticipantCount(count || 0);
    } catch (error: any) {
      console.error("Error loading event details:", error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log("Loading messages for event:", id);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages = (data || []).map((msg) => ({
        ...msg,
        isMe: msg.sender_id === user?.id,
      }));

      setMessages(formattedMessages);

      // Scroll to bottom after loading
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error: any) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = async () => {
    if (channelRef.current?.state === "subscribed") return;

    const channel = supabase.channel(`event:${id}:messages`, {
      config: { private: true },
    });

    channelRef.current = channel;

    // Set auth before subscribing
    await supabase.realtime.setAuth();

    channel
      .on("broadcast", { event: "INSERT" }, (payload) => {
        console.log("New message received:", payload);
        const newMessage = payload.payload.record;
        setMessages((prev) => [
          ...prev,
          {
            ...newMessage,
            isMe: newMessage.sender_id === user?.id,
          },
        ]);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });
  };

  const handleSend = async () => {
    if (!message.trim() || !user || sending) return;

    const messageText = message.trim();
    setSending(true);
    setMessage("");

    try {
      const { error } = await supabase.from("messages").insert({
        event_id: id as string,
        sender_id: user.id,
        sender_name: user.name,
        text: messageText,
      });

      if (error) throw error;

      console.log("Message sent successfully");
    } catch (error: any) {
      console.error("Error sending message:", error);
      setMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
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
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {eventName}
            </Text>
            <Text style={styles.headerSubtitle}>
              {participantCount} participants
            </Text>
          </View>
          <Pressable
            style={styles.infoButton}
            onPress={() => router.push(`/event/${id}` as any)}
          >
            <IconSymbol name="info.circle" size={24} color={colors.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageWrapper,
                  msg.isMe
                    ? styles.messageWrapperMe
                    : styles.messageWrapperOther,
                ]}
              >
                {!msg.isMe && (
                  <Text style={styles.senderName}>{msg.sender_name}</Text>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    msg.isMe
                      ? styles.messageBubbleMe
                      : styles.messageBubbleOther,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.isMe ? styles.messageTextMe : styles.messageTextOther,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
                <Text style={styles.timestamp}>
                  {formatTimestamp(msg.created_at)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              editable={!sending}
            />
            <Pressable
              style={[
                styles.sendButton,
                (!message.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!message.trim() || sending}
            >
              <IconSymbol
                name="arrow.up.circle.fill"
                size={36}
                color={message.trim() && !sending ? colors.primary : colors.textSecondary}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoButton: {
    padding: 8,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageWrapper: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  messageWrapperMe: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  messageWrapperOther: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleMe: {
    backgroundColor: colors.primary,
  },
  messageBubbleOther: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTextMe: {
    color: colors.text,
  },
  messageTextOther: {
    color: colors.text,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginHorizontal: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.highlight,
  },
  input: {
    flex: 1,
    backgroundColor: colors.highlight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    padding: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
