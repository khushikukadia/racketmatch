import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
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
  const { apiToken, session } = useAuth();
  const viewerId = session?.user?.id ?? null;
  const isOwnProfileList = viewerId === userId;
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingByUser, setFollowingByUser] = useState<Record<string, boolean>>({});
  const [busyByUser, setBusyByUser] = useState<Record<string, boolean>>({});

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    let cancelled = false;
    const fetcher = mode === 'followers' ? api.getFollowers : api.getFollowing;
    Promise.all([
      fetcher(apiToken, userId),
      viewerId ? api.getFollowing(apiToken, viewerId) : Promise.resolve([] as Profile[]),
    ])
      .then(([data, myFollowing]) => {
        if (cancelled) return;
        setUsers(data);
        const nextFollowing: Record<string, boolean> = {};
        for (const u of myFollowing) {
          nextFollowing[u.id] = true;
        }
        setFollowingByUser(nextFollowing);
      })
      .catch((e) => console.warn(e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiToken, userId, mode, viewerId]);

  const onToggleFollow = async (targetId: string) => {
    if (busyByUser[targetId]) return;
    const currentlyFollowing = !!followingByUser[targetId];
    setBusyByUser((m) => ({ ...m, [targetId]: true }));
    setFollowingByUser((m) => ({ ...m, [targetId]: !currentlyFollowing }));
    try {
      if (currentlyFollowing) {
        await api.unfollow(apiToken, targetId);
      } else {
        await api.follow(apiToken, targetId);
      }
    } catch (e) {
      console.warn(e);
      setFollowingByUser((m) => ({ ...m, [targetId]: currentlyFollowing }));
    } finally {
      setBusyByUser((m) => ({ ...m, [targetId]: false }));
    }
  };

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
          {isOwnProfileList && item.id !== viewerId ? (
            <Pressable
              style={({ pressed }) => [styles.followBtn, pressed && styles.followBtnPressed]}
              onPress={() => onToggleFollow(item.id)}
              disabled={!!busyByUser[item.id]}
            >
              <Text style={styles.followBtnText}>
                {busyByUser[item.id] ? 'Saving...' : followingByUser[item.id] ? 'Unfollow' : 'Follow'}
              </Text>
            </Pressable>
          ) : null}
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
  followBtn: {
    borderWidth: 1,
    borderColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  followBtnPressed: { opacity: 0.7 },
  followBtnText: { color: colors.primarySoft, fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
});
