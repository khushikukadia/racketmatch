import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { FeedPost, Profile, SportPreference } from '../api/types';
import { PhotoPickerField } from '../components/PhotoPickerField';
import { colors } from '../theme/colors';
import type { AppStackParamList } from '../navigation/types';

export function ProfileScreen() {
  const { apiToken, session, signOut, refreshProfileGate } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const userId = session?.user?.id ?? '';

  const openFollowList = (mode: 'followers' | 'following') => {
    if (!userId) return;
    navigation.getParent()?.navigate('FollowList', {
      userId,
      mode,
      title: mode === 'followers' ? 'Followers' : 'Following',
    });
  };
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sports, setSports] = useState<SportPreference[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [me, sp, po] = await Promise.all([
        api.getProfileMe(apiToken),
        api.getUserSports(apiToken, userId),
        api.getUserPosts(apiToken, userId),
      ]);
      setProfile(me);
      setSports(sp);
      setPosts(po);
      setName(me.name);
      setBio(me.bio ?? '');
      setCity(me.city ?? '');
      setPhotoUrl(me.photo_url ?? '');
    } finally {
      setLoading(false);
    }
  }, [apiToken, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const save = async () => {
    await api.updateProfile(apiToken, {
      name: name.trim(),
      bio: bio.trim() || null,
      city: city.trim() || null,
      photo_url: photoUrl.trim() || null,
    });
    setEditing(false);
    await load();
    await refreshProfileGate();
  };

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.card}>
            {editing ? (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} />
                <Text style={styles.label}>Bio</Text>
                <TextInput style={styles.input} value={bio} onChangeText={setBio} multiline />
                <Text style={styles.label}>City</Text>
                <TextInput style={styles.input} value={city} onChangeText={setCity} />
                <Text style={styles.label}>Profile photo</Text>
                <PhotoPickerField
                  variant="avatar"
                  value={photoUrl.trim() || null}
                  onChange={(url) => setPhotoUrl(url ?? '')}
                  style={styles.photoPicker}
                />
                <Pressable style={styles.primaryBtn} onPress={save}>
                  <Text style={styles.primaryBtnText}>Save</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(false)}>
                  <Text style={styles.link}>Cancel</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Image
                  source={{
                    uri: profile?.photo_url ?? 'https://picsum.photos/seed/p/120/120',
                  }}
                  style={styles.avatar}
                />
                <Text style={styles.name}>{profile?.name}</Text>
                {profile?.city ? <Text style={styles.city}>{profile.city}</Text> : null}
                <Text style={styles.bio}>{profile?.bio}</Text>
                <View style={styles.stats}>
                  <Pressable
                    style={({ pressed }) => [styles.statBtn, pressed && styles.statPressed]}
                    onPress={() => openFollowList('followers')}
                  >
                    <Text style={styles.statNum}>{profile?.follower_count ?? 0}</Text>
                    <Text style={styles.statLabel}>followers</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.statBtn, pressed && styles.statPressed]}
                    onPress={() => openFollowList('following')}
                  >
                    <Text style={styles.statNum}>{profile?.following_count ?? 0}</Text>
                    <Text style={styles.statLabel}>following</Text>
                  </Pressable>
                </View>
                <Pressable style={styles.secondaryBtn} onPress={() => setEditing(true)}>
                  <Text style={styles.secondaryBtnText}>Edit profile</Text>
                </Pressable>
              </>
            )}
          </View>
          <Text style={styles.section}>Sports</Text>
          {sports.map((s) => (
            <View key={s.id} style={styles.sportCard}>
              <Text style={styles.sportName}>{s.sport}</Text>
              <Text style={styles.sportDetail}>
                {s.skill_level} · priority {s.priority}
              </Text>
              <Text style={styles.sportSmall}>
                Times: {s.preferred_times?.join(', ')} · {s.preferred_locations?.join(', ')}
              </Text>
            </View>
          ))}
          <Text style={styles.section}>Your sessions</Text>
        </View>
      }
      data={posts}
      keyExtractor={(p) => p.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.postRow}>
          <Text style={styles.postSport}>{item.sport}</Text>
          <Text numberOfLines={2}>{item.caption}</Text>
          <Text style={styles.postMeta}>
            {item.like_count} likes · {item.comment_count} comments
          </Text>
        </View>
      )}
      ListFooterComponent={
        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 8 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.border },
  name: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 12 },
  city: { color: colors.textSecondary, marginTop: 4 },
  bio: { textAlign: 'center', color: colors.text, marginTop: 12, lineHeight: 22 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 16 },
  statBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 92,
  },
  statPressed: { backgroundColor: colors.background },
  statNum: { fontWeight: '800', color: colors.text, fontSize: 18 },
  statLabel: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  secondaryBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  secondaryBtnText: { color: colors.primary, fontWeight: '600' },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 24,
    marginBottom: 8,
  },
  sportCard: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sportName: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  sportDetail: { color: colors.textSecondary, marginTop: 4, textTransform: 'capitalize' },
  sportSmall: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  postRow: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postSport: { fontWeight: '700', textTransform: 'capitalize', marginBottom: 4 },
  postMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  signOut: { marginTop: 32, alignItems: 'center' },
  signOutText: { color: colors.danger, fontWeight: '600' },
  label: { alignSelf: 'stretch', fontWeight: '600', marginTop: 10, color: colors.text },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    backgroundColor: colors.background,
    color: colors.text,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: colors.white, fontWeight: '700' },
  link: { color: colors.primary, marginTop: 12, textAlign: 'center' },
  photoPicker: { alignSelf: 'stretch', marginTop: 8 },
});
