import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { MatchWithPreview } from '../api/types';
import { colors } from '../theme/colors';

export function MatchesScreen() {
  const navigation = useNavigation();
  const { apiToken } = useAuth();
  const [rows, setRows] = useState<MatchWithPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.getMatches(apiToken);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [apiToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Matches</Text>
      {loading && rows.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.match.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={rows.length === 0 ? styles.listEmpty : undefined}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No matches yet, your perfect doubles partner is still out there. Head to Discover and keep
              swinging.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() =>
                navigation
                  .getParent()
                  ?.navigate('Chat', { matchId: item.match.id, title: item.other_user.name })
              }
            >
              <Image
                source={{
                  uri: item.other_user.photo_url ?? 'https://picsum.photos/seed/m/100/100',
                }}
                style={styles.avatar}
              />
              <View style={styles.rowBody}>
                <Text style={styles.name}>{item.other_user.name}</Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.last_message_preview ?? 'Say hi and suggest a game'}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  listEmpty: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.background },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.border },
  rowBody: { marginLeft: 14, flex: 1 },
  name: { fontWeight: '700', fontSize: 17, color: colors.text },
  preview: { color: colors.text, marginTop: 4, fontSize: 15 },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 48,
    paddingHorizontal: 32,
    fontSize: 15,
    lineHeight: 22,
  },
});
