
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { supabase } from "@/app/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { GiftedChat, IMessage, Bubble, InputToolbar, Send, Composer, Avatar } from "react-native-gifted-chat";
import "react-native-get-random-values";

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState("Event Chat");
  const [eventIcon, setEventIcon] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const loadEventDetails = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("description, icon")
        .eq("id", id)
        .single();

      if (eventError) throw eventError;

      setEventName(eventData.description);
      setEventIcon(eventData.icon);

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
      const { data: eventMessages } = await supabase
        .from("messages")
        .select("id")
        .eq("event_id", id)
        .neq("sender_id", user.id);

      if (!eventMessages || eventMessages.length === 0) return;

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
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedMessages: IMessage[] = (data || []).map((msg) => ({
        _id: msg.id,
        text: msg.text,
        createdAt: new Date(msg.created_at),
        user: {
          _id: msg.sender_id,
          name: msg.sender_name,
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

  const setupRealtimeSubscription = async () => {
    if (channelRef.current?.state === "subscribed") return;

    const channel = supabase.channel(`event:${id}:messages`, {
      config: { private: true },
    });

    channelRef.current = channel;

    await supabase.realtime.setAuth();

    channel
      .on("broadcast", { event: "INSERT" }, (payload) => {
        console.log("New message received:", payload);
        const newMessage = payload.payload.record;
        
        const giftedMessage: IMessage = {
          _id: newMessage.id,
          text: newMessage.text,
          createdAt: new Date(newMessage.created_at),
          user: {
            _id: newMessage.sender_id,
            name: newMessage.sender_name,
            avatar: undefined,
          },
        };

        setMessages((previousMessages) =>
          GiftedChat.append(previousMessages, [giftedMessage])
        );
        
        markMessagesAsRead();
      })
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });
  };

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (!user || newMessages.length === 0) return;

    const messageText = newMessages[0].text.trim();
    if (!messageText) return;

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
    }
  }, [user, id]);

  const renderBubble = (props: any) => {
    const isCurrentUser = props.currentMessage?.user._id === user?.id;
    
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          left: {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.highlight,
            paddingVertical: 4,
            paddingHorizontal: 6,
            marginBottom: 4,
          },
          right: {
            backgroundColor: colors.primary,
            paddingVertical: 4,
            paddingHorizontal: 6,
            marginBottom: 4,
          },
        }}
        textStyle={{
          left: {
            color: colors.text,
            fontSize: 16,
            lineHeight: 22,
          },
          right: {
            color: colors.text,
            fontSize: 16,
            lineHeight: 22,
          },
        }}
        timeTextStyle={{
          left: {
            color: colors.textSecondary,
            fontSize: 11,
          },
          right: {
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: 11,
          },
        }}
        usernameStyle={{
          color: colors.primary,
          fontSize: 13,
          fontWeight: '600',
          marginBottom: 2,
        }}
        containerStyle={{
          left: {
            marginLeft: 8,
          },
          right: {
            marginRight: 8,
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
          paddingHorizontal: 8,
          minHeight: 60,
        }}
        primaryStyle={{
          alignItems: "center",
          minHeight: 44,
        }}
      />
    );
  };

  const renderComposer = (props: any) => {
    return (
      <Composer
        {...props}
        textInputStyle={{
          backgroundColor: colors.highlight,
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingTop: Platform.OS === 'ios' ? 10 : 8,
          paddingBottom: Platform.OS === 'ios' ? 10 : 8,
          marginLeft: 8,
          marginRight: 8,
          color: colors.text,
          fontSize: 16,
          lineHeight: 20,
          minHeight: 44,
        }}
        placeholder="Type a message..."
        placeholderTextColor={colors.textSecondary}
      />
    );
  };

  const renderSend = (props: any) => {
    const hasText = props.text?.trim().length > 0;
    
    return (
      <Send 
        {...props} 
        containerStyle={{ 
          justifyContent: "center", 
          alignItems: "center",
          paddingHorizontal: 8,
          paddingRight: 12,
          height: 44,
        }}
        disabled={!hasText}
      >
        <View style={[
          styles.sendButton,
          { backgroundColor: hasText ? colors.primary : colors.textSecondary }
        ]}>
          <IconSymbol
            name="arrow.up"
            size={20}
            color={colors.text}
          />
        </View>
      </Send>
    );
  };

  const renderAvatar = (props: any) => {
    if (props.currentMessage?.user._id === user?.id) {
      return null;
    }

    const avatarUrl = props.currentMessage?.user.avatar;

    return (
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatarImage}
            onError={() => {
              console.log("Avatar image failed to load");
            }}
          />
        ) : (
          <View style={styles.defaultAvatar}>
            <IconSymbol name="person.fill" size={20} color={colors.textSecondary} />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <LinearGradient
        colors={[colors.background, "#0a0a0a"]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={28} color={colors.text} />
          </Pressable>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.headerIconGradient}
          >
            {eventIcon ? (
              <Text style={styles.headerIcon}>{eventIcon}</Text>
            ) : (
              <IconSymbol name="calendar" size={24} color={colors.text} />
            )}
          </LinearGradient>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {eventName}
            </Text>
            <Text style={styles.headerSubtitle}>
              {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
            </Text>
          </View>
          <Pressable
            style={styles.infoButton}
            onPress={() => router.push(`/event/${id}` as any)}
          >
            <IconSymbol name="info.circle" size={28} color={colors.text} />
          </Pressable>
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
          renderComposer={renderComposer}
          renderSend={renderSend}
          renderAvatar={renderAvatar}
          alwaysShowSend
          scrollToBottom
          scrollToBottomComponent={() => (
            <View style={styles.scrollToBottomButton}>
              <IconSymbol name="chevron.down" size={20} color={colors.text} />
            </View>
          )}
          maxInputLength={1000}
          messagesContainerStyle={{
            backgroundColor: "transparent",
            paddingBottom: 8,
          }}
          bottomOffset={0}
          minInputToolbarHeight={60}
          renderUsernameOnMessage
          renderAvatarOnTop
          listViewProps={{
            style: {
              backgroundColor: "transparent",
            },
            contentContainerStyle: {
              paddingTop: 8,
            },
          }}
          textInputProps={{
            returnKeyType: "send",
            blurOnSubmit: false,
            multiline: true,
            numberOfLines: 4,
            maxLength: 1000,
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
    padding: 8,
  },
  headerIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginRight: 12,
  },
  headerIcon: {
    fontSize: 26,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoButton: {
    padding: 8,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 4,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  defaultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.highlight,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollToBottomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
});
