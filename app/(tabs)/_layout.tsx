
import React from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      name: '(home)',
      route: '/(tabs)/(home)/',
      icon: 'map.fill',
      label: 'Home',
    },
    {
      name: 'my-events',
      route: '/(tabs)/my-events',
      icon: 'calendar.badge.clock',
      label: 'My Events',
    },
    {
      name: 'friends',
      route: '/(tabs)/friends',
      icon: 'person.2.fill',
      label: 'Friends',
    },
    {
      name: 'messages',
      route: '/(tabs)/messages',
      icon: 'message.fill',
      label: 'Messages',
    },
  ];

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="(home)" />
        <Stack.Screen name="my-events" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="messages" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
