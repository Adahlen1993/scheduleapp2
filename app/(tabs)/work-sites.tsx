import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useOrgStore } from '../../src/store/org';

type WorkSite = {
  id: string;
  org_id: string;
  name: string;
  nickname: string | null;
  active: boolean;
};

export default function WorkSitesScreen() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const orgs = useOrgStore((s) => s.orgs);

  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) ?? null,
    [orgs, activeOrgId]
  );

  const [sites, setSites] = useState<WorkSite[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');

  async function loadSites() {
    if (!activeOrgId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('work_sites')
      .select('id,org_id,name,nickname,active')
      .eq('org_id', activeOrgId)
      .order('created_at', { ascending: false });

    setLoading(false);

    if (error) {
      Alert.alert('Failed to load sites', error.message);
      return;
    }

    setSites((data ?? []) as WorkSite[]);
  }

  useEffect(() => {
    void loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  async function createSite() {
    if (!activeOrgId) return;

    const n = name.trim();
    const nick = nickname.trim();

    if (!n) {
      Alert.alert('Missing name', 'Enter a work site name.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('work_sites').insert({
      org_id: activeOrgId,
      name: n,
      nickname: nick || null,
      created_by: (await supabase.auth.getUser()).data.user?.id, // required by schema
    });
    setLoading(false);

    if (error) {
      Alert.alert('Create failed', error.message);
      return;
    }

    setName('');
    setNickname('');
    Alert.alert('Created ✅', n);
    await loadSites();
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <ThemedText type="title">Work Sites</ThemedText>

      <ThemedView style={{ gap: 6 }}>
        <ThemedText type="defaultSemiBold">Active organization</ThemedText>
        <Text>{activeOrg ? activeOrg.name : 'None selected'}</Text>
        {!activeOrgId && (
          <Text style={{ opacity: 0.7 }}>
            Go to the Orgs tab and select/create an organization first.
          </Text>
        )}
      </ThemedView>

      <ThemedView style={{ gap: 8 }}>
        <ThemedText type="defaultSemiBold">Create work site</ThemedText>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder='e.g. "Marge’s Diner"'
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        />
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder='Nickname (optional), e.g. "Diner"'
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        />

        <Pressable
          disabled={loading || !activeOrgId}
          onPress={createSite}
          style={{
            padding: 12,
            borderWidth: 1,
            borderRadius: 10,
            alignItems: 'center',
            opacity: loading || !activeOrgId ? 0.6 : 1,
          }}
        >
          <Text style={{ fontWeight: '600' }}>{loading ? 'Working…' : 'Create'}</Text>
        </Pressable>

        <Pressable
          disabled={loading || !activeOrgId}
          onPress={loadSites}
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
      </ThemedView>

      <ThemedView style={{ gap: 8 }}>
        <ThemedText type="defaultSemiBold">Sites in this org</ThemedText>

        {sites.length === 0 ? (
          <Text>No work sites yet.</Text>
        ) : (
          sites.map((s) => (
            <View
              key={s.id}
              style={{ padding: 12, borderWidth: 1, borderRadius: 10, gap: 4 }}
            >
              <Text style={{ fontWeight: '700' }}>
                {s.name} {s.nickname ? `(${s.nickname})` : ''}
              </Text>
              <Text style={{ opacity: 0.7 }}>{s.active ? 'Active' : 'Inactive'}</Text>
            </View>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}
