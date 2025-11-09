
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
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/app/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
  isMe: boolean;
}

export default function DirectMessageScreen() {
  const router = useRouter();
  const { id: otherUserId } = useLocalSearchParams();
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherUserName, setOtherUserName] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (otherUserId && user) {
      loadOtherUser();
      loadMessages();
      setupRealtimeSubscription();
    }

    return () => {
      if (channelRef.current) {
        console.log("[DirectMessage] Cleaning up realtime subscription");
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [otherUserId, user]);

  const loadOtherUser = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", otherUserId)
        .single();

      if (error) {
        console.error("[DirectMessage] Error loading user:", error);
        return;
      }

      setOtherUserName(data.name);
    } catch (error) {
      console.error("[DirectMessage] Error in loadOtherUser:", error);
    }
  };

  const loadMessages = async () => {
    try {
      if (!user) return;

      console.log("[DirectMessage] Loading messages...");

      // Fetch messages between current user and other user
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*, sender:profiles!direct_messages_sender_id_fkey(name)")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[DirectMessage] Error loading messages:", error);
        setLoading(false);
        return;
      }

      const formattedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        sender_id: msg.sender_id,
        sender_name: msg.sender.name,
        text: msg.text,
        created_at: msg.created_at,
        isMe: msg.sender_id === user.id,
      }));

      console.log(`[DirectMessage] Loaded ${formattedMessages.length} messages`);
      setMessages(formattedMessages);
      setLoading(false);

      // Mark messages as read
      await supabase
        .from("direct_messages")
        .update({ read: true })
        .eq("receiver_id", user.id)
        .eq("sender_id", otherUserId);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("[DirectMessage] Error in loadMessages:", error);
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    console.log("[DirectMessage] Setting up realtime subscription");

    const channel = supabase
      .channel(`direct-messages-${user.id}-${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `sender_id=eq.${otherUserId}`,
        },
        async (payload) => {
          console.log("[DirectMessage] New message received:", payload);

          // Fetch sender name
          const { data: senderData } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", payload.new.sender_id)
            .single();

          const newMsg: Message = {
            id: payload.new.id,
            sender_id: payload.new.sender_id,
            sender_name: senderData?.name || "Unknown",
            text: payload.new.text,
            created_at: payload.new.created_at,
            isMe: payload.new.sender_id === user.id,
          };

          setMessages((prev) => [...prev, newMsg]);

          // Mark as read
          await supabase
            .from("direct_messages")
            .update({ read: true })
            .eq("id", payload.new.id);

          // Scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const messageText = newMessage.trim();
      setNewMessage("");

      console.log("[DirectMessage] Sending message:", messageText);

      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: otherUserId,
        text: messageText,
      });

      if (error) {
        console.error("[DirectMessage] Error sending message:", error);
        return;
      }

      // Add message to local state immediately
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        sender_name: user.name,
        text: messageText,
        created_at: new Date().toISOString(),
        isMe: true,
      };

      setMessages((prev) => [...prev, tempMessage]);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("[DirectMessage] Error in handleSend:", error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{otherUserName}</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconSymbol
                  name="bubble.left.and.bubble.right"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>
                  Start a conversation with {otherUserName}
                </Text>
              </View>
            ) : (
              messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageRow,
                    message.isMe ? styles.messageRowMe : styles.messageRowOther,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      message.isMe
                        ? styles.messageBubbleMe
                        : styles.messageBubbleOther,
                    ]}
                  >
                    <Text style={styles.messageText}>{message.text}</Text>
                    <Text style={styles.messageTime}>
                      {formatTimestamp(message.created_at)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[
              styles.sendButton,
              !newMessage.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim()}
          >
            <LinearGradient
              colors={
                newMessage.trim()
                  ? [colors.primary, colors.secondary]
                  : [colors.highlight, colors.highlight]
              }
              style={styles.sendButtonGradient}
            >
              <IconSymbol name="arrow.up" size={20} color={colors.text} />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.highlight,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
  messageRow: {
    marginBottom: 12,
  },
  messageRowMe: {
    alignItems: "flex-end",
  },
  messageRowOther: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    color: colors.textSecondary,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.highlight,
    backgroundColor: colors.background,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
