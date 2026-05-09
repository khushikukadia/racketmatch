import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Profile } from '../api/types';
import { colors } from '../theme/colors';
import type { AppStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'FollowList'>;
  route: RouteProp<AppStackParamList, 'FollowList'>;
};

export function FollowListScreen({ navigation, route }: Props) {
  const { userId, mode, title } = route.params;
  const { apiToken } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    let cancelled = false;
    const fetcher = mode === 'followers' ? api.getFollowers : api.getFollowing;
    fetcher(apiToken, userId)
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((e) => console.warn(e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiToken, userId, mode]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(u) => u.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>
          {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Image
            source={{ uri: item.photo_url ?? 'https://picsum.photos/seed/u/80/80' }}
            style={styles.avatar}
          />
          <View style={styles.body}>
            <Text style={styles.name}>{item.name}</Text>
            {item.city ? <Text style={styles.meta}>{item.city}</Text> : null}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  list: { padding: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  body: { marginLeft: 12, flex: 1 },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
  meta: { color: colors.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
});
