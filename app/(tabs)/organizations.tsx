import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { useOrgStore } from '../../src/store/org';

export default function OrganizationsScreen() {
  const {
    orgs,
    activeOrgId,
    loading,
    fetchOrgs,
    setActiveOrgId,
    createOrg,
  } = useOrgStore();

  const [newOrgName, setNewOrgName] = useState('');

  useEffect(() => {
    fetchOrgs().catch((e) => Alert.alert('Failed to load orgs', e.message));
  }, [fetchOrgs]);

  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) ?? null,
    [orgs, activeOrgId]
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <ThemedText type="title">Organizations</ThemedText>

      <ThemedView style={{ gap: 6 }}>
        <ThemedText type="defaultSemiBold">Active</ThemedText>
        <Text>{activeOrg ? activeOrg.name : 'None selected'}</Text>
      </ThemedView>

      <ThemedView style={{ gap: 8 }}>
        <ThemedText type="defaultSemiBold">Create organization</ThemedText>

        <TextInput
          value={newOrgName}
          onChangeText={setNewOrgName}
          placeholder="Organization name"
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        />

        <Pressable
          disabled={loading || !newOrgName.trim()}
          onPress={async () => {
            try {
              const name = newOrgName.trim();
              await createOrg(name);
              setNewOrgName('');
              Alert.alert('Created ✅', name);
            } catch (e: any) {
              Alert.alert('Create failed', e.message ?? 'Unknown error');
            }
          }}
          style={{
            padding: 12,
            borderWidth: 1,
            borderRadius: 10,
            alignItems: 'center',
            opacity: loading || !newOrgName.trim() ? 0.6 : 1,
          }}
        >
          <Text style={{ fontWeight: '600' }}>{loading ? 'Working…' : 'Create'}</Text>
        </Pressable>

        <Pressable
          onPress={() => fetchOrgs().catch((e) => Alert.alert('Refresh failed', e.message))}
          style={{ padding: 12, borderWidth: 1, borderRadius: 10, alignItems: 'center' }}
        >
          <Text>Refresh</Text>
        </Pressable>
      </ThemedView>

      <ThemedView style={{ gap: 8 }}>
        <ThemedText type="defaultSemiBold">Your organizations</ThemedText>

        {orgs.length === 0 ? (
          <Text>No organizations yet.</Text>
        ) : (
          orgs.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => setActiveOrgId(o.id)}
              style={{
                padding: 12,
                borderWidth: 1,
                borderRadius: 10,
                opacity: o.id === activeOrgId ? 1 : 0.85,
              }}
            >
              <Text style={{ fontWeight: o.id === activeOrgId ? '700' : '400' }}>
                {o.name} {o.id === activeOrgId ? '✅' : ''}
              </Text>
              <Text style={{ opacity: 0.7 }}>{o.timezone}</Text>
            </Pressable>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}
