
import { IconSymbol } from "@/components/IconSymbol";
import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@/contexts/UserContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { KeyboardAwareComposer } from "@/components/KeyboardAwareComposer";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
  isMe: boolean;
}

export default function DirectMessageScreen() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserName, setOtherUserName] = useState("");
  const router = useRouter();
  const { id: otherUserId } = useLocalSearchParams();
  const scrollViewRef = useRef<any>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (otherUserId && user) {
      loadOtherUser();
      loadMessages();
      markMessagesAsRead();
      setupRealtimeSubscription();
    }

    return () => {
      if (channelRef.current) {
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

      if (error) throw error;
      setOtherUserName(data.name);
    } catch (error: any) {
      console.error("Error loading other user:", error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user || !otherUserId) return;

    try {
      // Mark all messages from the other user as read
      await supabase
        .from("direct_messages")
        .update({ read: true })
        .eq("sender_id", otherUserId)
        .eq("receiver_id", user.id)
        .eq("read", false);
    } catch (error: any) {
      console.error("Error marking messages as read:", error);
    }
  };

  const loadMessages = async () => {
    if (!user || !otherUserId) return;

    try {
      setLoading(true);
      console.log("Loading direct messages");

      const { data, error } = await supabase
        .from("direct_messages")
        .select(`
          id,
          sender_id,
          text,
          created_at,
          profiles!direct_messages_sender_id_fkey(name)
        `)
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages = (data || []).map((msg) => ({
        id: msg.id,
        sender_id: msg.sender_id,
        sender_name: (msg.profiles as any)?.name || "Unknown",
        text: msg.text,
        created_at: msg.created_at,
        isMe: msg.sender_id === user.id,
      }));

      setMessages(formattedMessages);
    } catch (error: any) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user || !otherUserId) return;

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
        (payload) => {
          console.log("New message received:", payload);
          loadMessages();
          markMessagesAsRead();
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !otherUserId || sending) return;

    const messageText = newMessage.trim();
    setSending(true);
    
    // Clear input immediately
    setNewMessage("");

    try {
      console.log("Sending direct message");

      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: otherUserId as string,
        text: messageText,
      });

      if (error) throw error;

      // Create notification for receiver
      await supabase.from("notifications").insert({
        user_id: otherUserId as string,
        type: "message",
        title: "New Message",
        message: `${user.name}: ${messageText.substring(0, 50)}${
          messageText.length > 50 ? "..." : ""
        }`,
        related_id: user.id,
      });

      loadMessages();
    } catch (error: any) {
      console.error("Error sending message:", error);
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const handleBack = () => {
    router.back();
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
          <Pressable style={styles.backButton} onPress={handleBack}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{otherUserName}</Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <KeyboardAwareScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            extraScrollHeight={100}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageWrapper,
                  message.isMe
                    ? styles.myMessageWrapper
                    : styles.theirMessageWrapper,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.isMe ? styles.myMessage : styles.theirMessage,
                  ]}
                >
                  <Text style={styles.messageText}>{message.text}</Text>
                  <Text style={styles.messageTime}>
                    {formatTimestamp(message.created_at)}
                  </Text>
                </View>
              </View>
            ))}

            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <IconSymbol
                  name="message"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>
                  Start the conversation!
                </Text>
              </View>
            )}
            
            {/* Extra space for composer */}
            <View style={{ height: 120 }} />
          </KeyboardAwareScrollView>

          <KeyboardAwareComposer
            value={newMessage}
            onChangeText={setNewMessage}
            onSend={handleSend}
            placeholder="Type a message..."
            disabled={false}
            sending={sending}
            maxLines={5}
            sendButtonColor={colors.primary}
          />
        </View>
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
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 12,
    maxWidth: "80%",
  },
  myMessageWrapper: {
    alignSelf: "flex-end",
  },
  theirMessageWrapper: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  myMessage: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    color: colors.textSecondary,
    alignSelf: "flex-end",
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
  },
});
