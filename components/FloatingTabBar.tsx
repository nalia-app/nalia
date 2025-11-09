
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

export interface TabBarItem {
  name: string;
  route: string;
  icon: string;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({
  tabs,
  containerWidth = 360,
  borderRadius = 20,
  bottomMargin = 0,
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);

  useEffect(() => {
    if (user) {
      checkUnreadMessages();
      checkPendingRequests();

      // Set up real-time subscriptions
      const messagesChannel = supabase
        .channel(`tab-messages-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          () => {
            checkUnreadMessages();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
          },
          () => {
            checkUnreadMessages();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_reads',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            checkUnreadMessages();
          }
        )
        .subscribe();

      const friendsChannel = supabase
        .channel(`tab-friends-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships',
            filter: `friend_id=eq.${user.id}`,
          },
          () => {
            checkPendingRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(friendsChannel);
      };
    }
  }, [user]);

  const checkUnreadMessages = async () => {
    if (!user) return;

    try {
      // Check for unread direct messages
      const { count: dmCount } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);

      // Check for unread event messages
      const { data: attendeeData } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      const eventIds = attendeeData?.map((a) => a.event_id) || [];

      let eventMessageCount = 0;
      if (eventIds.length > 0) {
        // Get all messages from user's events that aren't from the user
        const { data: allMessages } = await supabase
          .from('messages')
          .select('id')
          .in('event_id', eventIds)
          .neq('sender_id', user.id);

        if (allMessages && allMessages.length > 0) {
          const messageIds = allMessages.map((m) => m.id);
          
          // Check which messages have been read
          const { data: readMessages } = await supabase
            .from('message_reads')
            .select('message_id')
            .eq('user_id', user.id)
            .in('message_id', messageIds);

          const readMessageIds = new Set(readMessages?.map((r) => r.message_id) || []);
          eventMessageCount = messageIds.filter((id) => !readMessageIds.has(id)).length;
        }
      }

      setHasUnreadMessages((dmCount || 0) > 0 || eventMessageCount > 0);
    } catch (error) {
      console.error('Error checking unread messages:', error);
    }
  };

  const checkPendingRequests = async () => {
    if (!user) return;

    try {
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      console.log('Pending friend requests count:', count);
      setHasPendingRequests((count || 0) > 0);
    } catch (error) {
      console.error('Error checking pending requests:', error);
    }
  };

  const handleTabPress = (route: string) => {
    console.log('Tab pressed:', route, 'Current pathname:', pathname);
    
    // Normalize routes for comparison
    const normalizedRoute = route.replace('/(tabs)', '');
    const normalizedPathname = pathname.replace('/(tabs)', '');
    
    // Check if we're already on this exact route
    if (normalizedPathname === normalizedRoute || 
        (normalizedRoute === '/(home)' && normalizedPathname === '/')) {
      console.log('Already on this route, skipping navigation');
      return;
    }
    
    router.push(route as any);
  };

  const isActive = (route: string) => {
    const normalizedRoute = route.replace('/(tabs)', '');
    const normalizedPathname = pathname.replace('/(tabs)', '');
    
    // Special handling for home route
    if (normalizedRoute === '/(home)') {
      return normalizedPathname === '/' || normalizedPathname === '/(home)';
    }
    
    return normalizedPathname.includes(normalizedRoute);
  };

  const shouldShowBadge = (tabName: string) => {
    if (tabName === 'messages') return hasUnreadMessages;
    if (tabName === 'friends') return hasPendingRequests;
    return false;
  };

  return (
    <View style={[styles.container, { bottom: bottomMargin }]}>
      <BlurView
        intensity={80}
        tint="dark"
        style={[
          styles.tabBar,
          {
            width: containerWidth,
            borderRadius: borderRadius,
          },
        ]}
      >
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => {
            const active = isActive(tab.route);
            const showBadge = shouldShowBadge(tab.name);
            
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tab}
                onPress={() => handleTabPress(tab.route)}
                activeOpacity={0.7}
              >
                <View style={styles.tabContent}>
                  <View style={styles.iconContainer}>
                    <IconSymbol
                      name={tab.icon as any}
                      size={24}
                      color={active ? colors.primary : colors.text}
                    />
                    {showBadge && (
                      <View style={styles.badge} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: active ? colors.primary : colors.text },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  tabBar: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.highlight,
    overflow: 'hidden',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: 'rgba(30, 30, 30, 0.95)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
