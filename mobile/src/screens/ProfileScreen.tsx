import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import type { FeedPost, Priority, Profile, SkillLevel, Sport, SportPreference } from '../api/types';
import { PhotoPickerField } from '../components/PhotoPickerField';
import { colors } from '../theme/colors';
import { buttonStyles } from '../theme/buttons';
import type { AppStackParamList } from '../navigation/types';

const SPORTS: Sport[] = ['tennis', 'squash', 'pickleball'];
const SKILLS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
const PRIORITY_UI: { label: string; value: Priority }[] = [
  { label: 'Play more', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Play less', value: 'low' },
];
const TIMES = ['morning', 'afternoon', 'evening', 'night', 'weekends'];

type SportForm = {
  enabled: boolean;
  skill: SkillLevel;
  priority: Priority;
  times: string[];
  locations: string;
};

const defaultSport = (): SportForm => ({
  enabled: false,
  skill: 'intermediate',
  priority: 'medium',
  times: ['weekends'],
  locations: '',
});

function sportsToForms(sp: SportPreference[]): Record<Sport, SportForm> {
  const forms: Record<Sport, SportForm> = {
    tennis: defaultSport(),
    squash: defaultSport(),
    pickleball: defaultSport(),
  };
  for (const s of sp) {
    forms[s.sport] = {
      enabled: true,
      skill: s.skill_level,
      priority: s.priority,
      times: s.preferred_times?.length ? s.preferred_times : ['weekends'],
      locations: s.preferred_locations?.join(', ') ?? '',
    };
  }
  return forms;
}

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
  const [bySport, setBySport] = useState<Record<Sport, SportForm>>({
    tennis: defaultSport(),
    squash: defaultSport(),
    pickleball: defaultSport(),
  });

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
      setBySport(sportsToForms(sp));
    } finally {
      setLoading(false);
    }
  }, [apiToken, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleTime = (sport: Sport, t: string) => {
    setBySport((prev) => {
      const cur = prev[sport];
      const has = cur.times.includes(t);
      const times = has ? cur.times.filter((x) => x !== t) : [...cur.times, t];
      return { ...prev, [sport]: { ...cur, times } };
    });
  };

  const startEditing = () => {
    setBySport(sportsToForms(sports));
    setEditing(true);
  };

  const cancelEditing = () => {
    setName(profile?.name ?? '');
    setBio(profile?.bio ?? '');
    setCity(profile?.city ?? '');
    setPhotoUrl(profile?.photo_url ?? '');
    setBySport(sportsToForms(sports));
    setEditing(false);
  };

  const save = async () => {
    const sportsPayload = SPORTS.filter((s) => bySport[s].enabled).map((s) => {
      const f = bySport[s];
      const locs = f.locations
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      return {
        sport: s,
        skill_level: f.skill,
        priority: f.priority,
        preferred_times: f.times.length ? f.times : ['weekends'],
        preferred_locations: locs.length ? locs : [city.trim() || 'TBD'],
      };
    });
    if (sportsPayload.length === 0) {
      Alert.alert('Sports', 'Select at least one sport.');
      return;
    }
    await api.updateProfile(apiToken, {
      name: name.trim(),
      bio: bio.trim() || null,
      city: city.trim() || null,
      photo_url: photoUrl.trim() || null,
    });
    await api.updateSports(apiToken, sportsPayload);
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
                <Text style={styles.sportsHeading}>Sports</Text>
                {SPORTS.map((sport) => {
                  const f = bySport[sport];
                  return (
                    <View key={sport} style={styles.sportEditCard}>
                      <Pressable
                        style={styles.rowBetween}
                        onPress={() =>
                          setBySport((p) => ({ ...p, [sport]: { ...f, enabled: !f.enabled } }))
                        }
                      >
                        <Text style={styles.sportTitle}>{sport}</Text>
                        <Text style={styles.toggle}>{f.enabled ? '✓' : '＋'}</Text>
                      </Pressable>
                      {f.enabled ? (
                        <>
                          <Text style={styles.mini}>Skill</Text>
                          <View style={styles.pills}>
                            {SKILLS.map((sk) => (
                              <Pressable
                                key={sk}
                                style={[styles.pill, f.skill === sk && styles.pillOn]}
                                onPress={() =>
                                  setBySport((p) => ({ ...p, [sport]: { ...f, skill: sk } }))
                                }
                              >
                                <Text style={styles.pillText}>{sk}</Text>
                              </Pressable>
                            ))}
                          </View>
                          <Text style={styles.mini}>How much you want to play</Text>
                          <View style={styles.pills}>
                            {PRIORITY_UI.map((pr) => (
                              <Pressable
                                key={pr.value}
                                style={[styles.pill, f.priority === pr.value && styles.pillOn]}
                                onPress={() =>
                                  setBySport((p) => ({
                                    ...p,
                                    [sport]: { ...f, priority: pr.value },
                                  }))
                                }
                              >
                                <Text style={styles.pillText}>{pr.label}</Text>
                              </Pressable>
                            ))}
                          </View>
                          <Text style={styles.mini}>Preferred times</Text>
                          <View style={styles.pills}>
                            {TIMES.map((t) => (
                              <Pressable
                                key={t}
                                style={[styles.pill, f.times.includes(t) && styles.pillOn]}
                                onPress={() => toggleTime(sport, t)}
                              >
                                <Text style={styles.pillText}>{t}</Text>
                              </Pressable>
                            ))}
                          </View>
                          <Text style={styles.mini}>Home courts (comma separated)</Text>
                          <TextInput
                            style={styles.input}
                            value={f.locations}
                            onChangeText={(txt) =>
                              setBySport((p) => ({ ...p, [sport]: { ...f, locations: txt } }))
                            }
                            placeholder="Club name, public courts…"
                          />
                        </>
                      ) : null}
                    </View>
                  );
                })}
                <Pressable style={[buttonStyles.primary, styles.primaryBtn]} onPress={save}>
                  <Text style={buttonStyles.primaryText}>Save</Text>
                </Pressable>
                <Pressable onPress={cancelEditing}>
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
                <View style={styles.sportsBlock}>
                  <Text style={styles.sportsHeading}>Sports</Text>
                  {sports.length === 0 ? (
                    <Text style={styles.sportsEmpty}>No sports added yet.</Text>
                  ) : (
                    sports.map((s) => (
                      <View key={s.id} style={styles.sportCard}>
                        <Text style={styles.sportName}>{s.sport}</Text>
                        <Text style={styles.sportDetail}>
                          {s.skill_level} · priority {s.priority}
                        </Text>
                        <Text style={styles.sportSmall}>
                          Times: {s.preferred_times?.join(', ')} ·{' '}
                          {s.preferred_locations?.join(', ')}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
                <Pressable style={styles.secondaryBtn} onPress={startEditing}>
                  <Text style={styles.secondaryBtnText}>Edit profile</Text>
                </Pressable>
              </>
            )}
          </View>
          {!editing ? <Text style={styles.section}>Previous sessions</Text> : null}
        </View>
      }
      data={editing ? [] : posts}
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
        editing ? null : (
          <Pressable style={styles.signOut} onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
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
  sportsBlock: { alignSelf: 'stretch', marginTop: 20 },
  sportsHeading: {
    alignSelf: 'stretch',
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  sportsEmpty: { color: colors.textSecondary, fontSize: 14 },
  sportCard: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sportName: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  sportDetail: { color: colors.textSecondary, marginTop: 4, textTransform: 'capitalize' },
  sportSmall: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  secondaryBtn: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  secondaryBtnText: { color: colors.primarySoft, fontWeight: '600' },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 24,
    marginBottom: 8,
  },
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
  primaryBtn: { alignSelf: 'stretch', marginTop: 16 },
  link: { color: colors.primary, marginTop: 12, textAlign: 'center' },
  photoPicker: { alignSelf: 'stretch', marginTop: 8 },
  sportEditCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sportTitle: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize', color: colors.text },
  toggle: { fontSize: 22, color: colors.primary },
  mini: { marginTop: 10, marginBottom: 6, color: colors.textSecondary, fontSize: 13 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: { borderColor: colors.primary, backgroundColor: '#E8F5E9' },
  pillText: { fontSize: 13, color: colors.text, textTransform: 'capitalize' },
});
