import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useOrgStore } from '../../src/store/org';

type Invite = {
  id: string;
  org_id: string;
  email: string;
  role: 'owner' | 'manager' | 'employee';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  token: string;
  expires_at: string;
  created_at: string;
};

export default function InvitesScreen() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const orgs = useOrgStore((s) => s.orgs);

  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) ?? null,
    [orgs, activeOrgId]
  );

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'employee' | 'manager'>('employee');
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [lastToken, setLastToken] = useState<string | null>(null);

  async function loadInvites() {
    if (!activeOrgId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('org_invites')
      .select('id,org_id,email,role,status,token,expires_at,created_at')
      .eq('org_id', activeOrgId)
      .order('created_at', { ascending: false });

    setLoading(false);

    if (error) {
      Alert.alert('Failed to load invites', error.message);
      return;
    }

    setInvites((data ?? []) as Invite[]);
  }

  useEffect(() => {
    void loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  async function createInvite() {
    if (!activeOrgId) return;

    const e = email.trim().toLowerCase();
    if (!e) {
      Alert.alert('Missing email', 'Enter an email to invite.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('create_org_invite', {
      p_org_id: activeOrgId,
      p_email: e,
      p_role: role,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Invite failed', error.message);
      return;
    }

    const token = data as unknown as string;
    setLastToken(token);
    setEmail('');
    Alert.alert('Invite created ✅', `Token:\n${token}`);
    await loadInvites();
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <ThemedText type="title">Invites</ThemedText>

      <ThemedView style={{ gap: 6 }}>
        <ThemedText type="defaultSemiBold">Active organization</ThemedText>
        <Text>{activeOrg ? activeOrg.name : 'None selected'}</Text>
        {!activeOrgId && (
          <Text style={{ opacity: 0.7 }}>
            Go to the Orgs tab and select an organization first.
          </Text>
        )}
      </ThemedView>

      <ThemedView style={{ gap: 8 }}>
        <ThemedText type="defaultSemiBold">Create invite</ThemedText>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="employee@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setRole('employee')}
            style={{
              flex: 1,
              padding: 12,
              borderWidth: 1,
              borderRadius: 10,
              alignItems: 'center',
              opacity: role === 'employee' ? 1 : 0.7,
            }}
          >
            <Text style={{ fontWeight: role === 'employee' ? '700' : '400' }}>Employee</Text>
          </Pressable>

          <Pressable
            onPress={() => setRole('manager')}
            style={{
              flex: 1,
              padding: 12,
              borderWidth: 1,
              borderRadius: 10,
              alignItems: 'center',
              opacity: role === 'manager' ? 1 : 0.7,
            }}
          >
            <Text style={{ fontWeight: role === 'manager' ? '700' : '400' }}>Manager</Text>
          </Pressable>
        </View>

        <Pressable
          disabled={loading || !activeOrgId}
          onPress={createInvite}
          style={{
            padding: 12,
            borderWidth: 1,
            borderRadius: 10,
            alignItems: 'center',
            opacity: loading || !activeOrgId ? 0.6 : 1,
          }}
        >
          <Text style={{ fontWeight: '600' }}>{loading ? 'Working…' : 'Send invite'}</Text>
        </Pressable>

        <Pressable
          disabled={loading || !activeOrgId}
          onPress={loadInvites}
          style={{
            padding: 12,
            borderWidth: 1,
            borderRadius: 10,
            alignItems: 'center',
            opacity: loading || !activeOrgId ? 0.6 : 1,
          }}
        >
          <Text>Refresh</Text>
        </Pressable>

        {!!lastToken && (
          <Text style={{ opacity: 0.8 }}>
            Last token (copy for testing): {lastToken}
          </Text>
        )}
      </ThemedView>

      <ThemedView style={{ gap: 8 }}>
        <ThemedText type="defaultSemiBold">Invites</ThemedText>

        {invites.length === 0 ? (
          <Text>No invites yet.</Text>
        ) : (
          invites.map((i) => (
            <View key={i.id} style={{ padding: 12, borderWidth: 1, borderRadius: 10, gap: 4 }}>
              <Text style={{ fontWeight: '700' }}>{i.email}</Text>
              <Text>Role: {i.role}</Text>
              <Text>Status: {i.status}</Text>
              <Text style={{ opacity: 0.7 }}>Token: {i.token}</Text>
              <Text style={{ opacity: 0.7 }}>Expires: {new Date(i.expires_at).toLocaleString()}</Text>
            </View>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}
