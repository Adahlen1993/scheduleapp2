import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useOrgStore } from '../../src/store/org';

export default function RedeemInviteScreen() {
  const fetchOrgs = useOrgStore((s) => s.fetchOrgs);
  const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  async function redeem() {
    const t = token.trim();
    if (!t) {
      Alert.alert('Missing token', 'Paste the invite token.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('redeem_org_invite', { p_token: t });
    setLoading(false);

    if (error) {
      Alert.alert('Redeem failed', error.message);
      return;
    }

    const orgId = data as unknown as string;

    // refresh org list + set active to the org we just joined
    try {
      await fetchOrgs();
      setActiveOrgId(orgId);
    } catch {
      // ignore; not critical
    }

    setToken('');
    Alert.alert('Joined ✅', `Organization ID:\n${orgId}`);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <ThemedText type="title">Redeem Invite</ThemedText>

      <ThemedView style={{ gap: 8 }}>
        <ThemedText type="defaultSemiBold">Invite token</ThemedText>

        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="Paste token here"
          autoCapitalize="none"
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        />

        <Pressable
          disabled={loading}
          onPress={redeem}
          style={{
            padding: 12,
            borderWidth: 1,
            borderRadius: 10,
            alignItems: 'center',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text style={{ fontWeight: '600' }}>{loading ? 'Working…' : 'Redeem'}</Text>
        </Pressable>
      </ThemedView>

      <Text style={{ opacity: 0.7 }}>
        MVP note: later this becomes an email link / deep link. For now, paste the token.
      </Text>
    </ScrollView>
  );
}
