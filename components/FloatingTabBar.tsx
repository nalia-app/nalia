
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import React from 'react';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

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

  const handleTabPress = (route: string) => {
    console.log('Tab pressed:', route);
    router.push(route as any);
  };

  const isActive = (route: string) => {
    return pathname.includes(route.replace('/(tabs)', ''));
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
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tab}
                onPress={() => handleTabPress(tab.route)}
                activeOpacity={0.7}
              >
                <View style={styles.tabContent}>
                  <IconSymbol
                    name={tab.icon as any}
                    size={24}
                    color={active ? colors.primary : colors.text}
                  />
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
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
