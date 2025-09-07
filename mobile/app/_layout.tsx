import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useThemeColors } from '../src/theme';
import { useDataStore } from '../src/store';

export default function Layout() {
  const fetchGeneralDataOncePerDay = useDataStore((s) => s.fetchGeneralDataOncePerDay);
  useEffect(() => { fetchGeneralDataOncePerDay(); }, [fetchGeneralDataOncePerDay]);
  const colors = useThemeColors();
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'All Items' }} />
        <Tabs.Screen name="daily" options={{ title: 'Daily Items' }} />
        <Tabs.Screen name="hours" options={{ title: 'Hours' }} />
      </Tabs>
    </SafeAreaProvider>
  );
}


