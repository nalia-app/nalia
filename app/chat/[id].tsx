
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
  Image,
  Keyboard,
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
  sender_avatar: string | null;
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
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (user && id) {
      loadEventDetails();
      loadMessages();
      markMessagesAsRead();
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

  const markMessagesAsRead = async () => {
    if (!user || !id) return;

    try {
      // Get all messages in this event
      const { data: eventMessages } = await supabase
        .from("messages")
        .select("id")
        .eq("event_id", id)
        .neq("sender_id", user.id);

      if (!eventMessages || eventMessages.length === 0) return;

      // Mark all as read by inserting into message_reads (on conflict do nothing)
      const readRecords = eventMessages.map((msg) => ({
        message_id: msg.id,
        user_id: user.id,
      }));

      await supabase
        .from("message_reads")
        .upsert(readRecords, { onConflict: "message_id,user_id" });

      console.log("Marked messages as read");
    } catch (error: any) {
      console.error("Error marking messages as read:", error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log("Loading messages for event:", id);

      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profiles:sender_id(avatar_url)
        `)
        .eq("event_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages = (data || []).map((msg) => ({
        ...msg,
        sender_avatar: (msg.profiles as any)?.avatar_url || null,
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
            sender_avatar: null, // Will be loaded on next refresh
            isMe: newMessage.sender_id === user?.id,
          },
        ]);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        // Mark new messages as read
        markMessagesAsRead();
      })
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });
  };

  const handleSend = async () => {
    if (!message.trim() || !user || sending) return;

    const messageText = message.trim();
    setSending(true);
    
    // Clear input immediately and keep keyboard open
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
      
      // Keep focus on input to maintain keyboard
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <LinearGradient
        colors={[colors.background, "#0a0a0a"]}
        style={styles.gradient}
      >
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
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }
            keyboardShouldPersistTaps="handled"
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
                  <View style={styles.messageHeader}>
                    <View style={styles.senderAvatar}>
                      {msg.sender_avatar ? (
                        <Image
                          source={{ uri: msg.sender_avatar }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <IconSymbol name="person.fill" size={14} color={colors.text} />
                      )}
                    </View>
                    <Text style={styles.senderName}>{msg.sender_name}</Text>
                  </View>
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

          <SafeAreaView style={styles.inputWrapper} edges={["bottom"]}>
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor={colors.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                editable={!sending}
                blurOnSubmit={false}
                returnKeyType="default"
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
          </SafeAreaView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
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
    paddingBottom: 8,
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
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginLeft: 4,
  },
  senderAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.highlight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    overflow: "hidden",
  },
  avatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  senderName: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
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
  inputWrapper: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.highlight,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
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
