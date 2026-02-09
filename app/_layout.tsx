import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSessionStore } from '../src/store/session';

import { QueryClientProvider } from '@tanstack/react-query'; // ✅ add
import { queryClient } from '../src/lib/queryClient'; // ✅ add

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const init = useSessionStore((s) => s.init);
  const loading = useSessionStore((s) => s.loading);
  const user = useSessionStore((s) => s.user);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [loading, user, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
