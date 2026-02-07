import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSessionStore } from '../src/store/session';

export default function RootLayout() {
  const init = useSessionStore((s) => s.init);
  const loading = useSessionStore((s) => s.loading);

  useEffect(() => {
    void init();
  }, [init]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
