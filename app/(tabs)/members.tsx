import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useOrgMembers } from "../../src/hooks/useOrgMembers";
import { useOrgStore } from "../../src/store/org";
import type { OrgMemberRow } from "../../src/types/org";

function displayName(m: OrgMemberRow) {
  const name = [m.first_name, m.last_name].filter(Boolean).join(" ");
  return name || m.email || "Unknown";
}

export default function MembersTab() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);

  const { data, isLoading, error, refetch } = useOrgMembers(activeOrgId);

  if (!activeOrgId) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16 }}>
          Select an organization to view members.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ padding: 16 }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading members…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>
          Failed to load members.
        </Text>
        <Text style={{ opacity: 0.8, marginBottom: 12 }}>
          {String((error as any)?.message ?? error)}
        </Text>

        <Pressable
          onPress={() => refetch()}
          style={{
            padding: 12,
            backgroundColor: "#ddd",
            borderRadius: 8,
            alignSelf: "flex-start",
          }}
        >
          <Text>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
        Members ({data?.length ?? 0})
      </Text>

      <FlatList
        data={data ?? []}
        keyExtractor={(item, index) => item.user_id ?? `${item.email}-${index}`}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderWidth: 1, borderRadius: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>
              {displayName(item)}
            </Text>

            <Text style={{ marginTop: 4 }}>{item.email ?? "—"}</Text>

            <Text style={{ marginTop: 4 }}>
              {item.role} • {item.member_type === "invited" ? "Invited" : "Active"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
