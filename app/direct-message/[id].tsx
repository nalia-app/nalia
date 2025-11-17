
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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
import { GiftedChat, IMessage, Bubble, InputToolbar, Send, Time } from "react-native-gifted-chat";

export default function DirectMessageScreen() {
  const { user } = useUser();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherUserName, setOtherUserName] = useState("");
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null);
  const router = useRouter();
  const { id: otherUserId } = useLocalSearchParams();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, user]);

  const loadOtherUser = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", otherUserId)
        .single();

      if (error) throw error;
      setOtherUserName(data.name);
      setOtherUserAvatar(data.avatar_url);
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
          profiles!direct_messages_sender_id_fkey(name, avatar_url)
        `)
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform messages to GiftedChat format
      const formattedMessages: IMessage[] = (data || []).map((msg) => ({
        _id: msg.id,
        text: msg.text,
        createdAt: new Date(msg.created_at),
        user: {
          _id: msg.sender_id,
          name: (msg.profiles as any)?.name || "Unknown",
          avatar: (msg.profiles as any)?.avatar_url || undefined,
        },
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

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (!user || !otherUserId || newMessages.length === 0) return;

    const messageText = newMessages[0].text;

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
    }
  }, [user, otherUserId]);

  const renderBubble = (props: any) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          left: {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.highlight,
          },
          right: {
            backgroundColor: colors.primary,
          },
        }}
        textStyle={{
          left: {
            color: colors.text,
          },
          right: {
            color: colors.text,
          },
        }}
        timeTextStyle={{
          left: {
            color: colors.textSecondary,
          },
          right: {
            color: '#FFFFFF',
          },
        }}
      />
    );
  };

  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={{
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.highlight,
          paddingVertical: 8,
        }}
        primaryStyle={{
          alignItems: "center",
        }}
      />
    );
  };

  const renderSend = (props: any) => {
    return (
      <Send {...props} containerStyle={{ justifyContent: "center", paddingHorizontal: 8 }}>
        <IconSymbol
          name="arrow.up.circle.fill"
          size={36}
          color={props.text?.trim() ? colors.primary : colors.textSecondary}
        />
      </Send>
    );
  };

  const renderTime = (props: any) => {
    return (
      <Time
        {...props}
        timeTextStyle={{
          left: {
            color: colors.textSecondary,
          },
          right: {
            color: '#FFFFFF',
          },
        }}
      />
    );
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
          <View style={styles.headerAvatarContainer}>
            {otherUserAvatar ? (
              <View style={styles.avatarImage}>
                <IconSymbol name="person.fill" size={24} color={colors.text} />
              </View>
            ) : (
              <IconSymbol name="person.fill" size={24} color={colors.text} />
            )}
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{otherUserName}</Text>
          </View>
        </View>

        <GiftedChat
          messages={messages}
          onSend={(messages) => onSend(messages)}
          user={{
            _id: user?.id || "",
            name: user?.name || "",
          }}
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderSend={renderSend}
          renderTime={renderTime}
          alwaysShowSend
          scrollToBottom
          scrollToBottomComponent={() => (
            <IconSymbol name="chevron.down.circle.fill" size={32} color={colors.primary} />
          )}
          placeholder="Type a message..."
          textInputStyle={{
            backgroundColor: colors.highlight,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 8,
            color: colors.text,
          }}
          maxInputLength={1000}
          messagesContainerStyle={{
            backgroundColor: "transparent",
          }}
          renderAvatar={null}
          listViewProps={{
            style: {
              backgroundColor: "transparent",
            },
          }}
        />
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
  headerAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
  },
});
