import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { Priority, SkillLevel, Sport } from '../api/types';
import { PhotoPickerField } from '../components/PhotoPickerField';
import { AppBrand } from '../components/AppBrand';
import { colors } from '../theme/colors';
import { buttonStyles } from '../theme/buttons';

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

export function OnboardingScreen() {
  const { apiToken, refreshProfileGate } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [bySport, setBySport] = useState<Record<Sport, SportForm>>({
    tennis: { ...defaultSport(), enabled: true },
    squash: defaultSport(),
    pickleball: defaultSport(),
  });
  const [busy, setBusy] = useState(false);

  const toggleTime = (sport: Sport, t: string) => {
    setBySport((prev) => {
      const cur = prev[sport];
      const has = cur.times.includes(t);
      const times = has ? cur.times.filter((x) => x !== t) : [...cur.times, t];
      return { ...prev, [sport]: { ...cur, times } };
    });
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Add your name to continue.');
      return;
    }
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
    setBusy(true);
    try {
      await api.updateProfile(apiToken, {
        name: name.trim(),
        bio: bio.trim() || null,
        city: city.trim() || null,
        photo_url: photoUrl.trim() || null,
      });
      await api.updateSports(apiToken, sportsPayload);
      await refreshProfileGate();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.inner}
      keyboardShouldPersistTaps="handled"
    >
      <AppBrand size="sm" showName={false} style={styles.brand} />
      <Text style={styles.h1}>Build your player card</Text>
      <Text style={styles.sub}>Squash, tennis, pickleball. Show how you like to play.</Text>

      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.placeholder}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.tall]}
        value={bio}
        onChangeText={setBio}
        placeholder="Favorite courts, playing style…"
        placeholderTextColor={colors.placeholder}
        multiline
      />

      <Text style={styles.label}>City</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder="e.g. Oakland"
        placeholderTextColor={colors.placeholder}
      />

      <Text style={styles.label}>Profile photo (optional)</Text>
      <PhotoPickerField
        variant="avatar"
        value={photoUrl.trim() || null}
        onChange={(url) => setPhotoUrl(url ?? '')}
        style={styles.photoPicker}
      />

      {SPORTS.map((sport) => {
        const f = bySport[sport];
        return (
          <View key={sport} style={styles.card}>
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
                      onPress={() => setBySport((p) => ({ ...p, [sport]: { ...f, skill: sk } }))}
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
                        setBySport((p) => ({ ...p, [sport]: { ...f, priority: pr.value } }))
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
                  onChangeText={(txt) => setBySport((p) => ({ ...p, [sport]: { ...f, locations: txt } }))}
                  placeholder="Club name, public courts…"
                  placeholderTextColor={colors.placeholder}
                />
              </>
            ) : null}
          </View>
        );
      })}

      <Pressable
        style={[buttonStyles.primary, styles.primaryBtn, busy && buttonStyles.disabled]}
        onPress={save}
        disabled={busy}
      >
        <Text style={buttonStyles.primaryText}>{busy ? 'Saving…' : 'Save profile'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    // On web, give the scroll container an explicit bounded height so it scrolls
    // instead of growing with its content and getting clipped by the parent.
    ...(Platform.OS === 'web' ? { height: '100%' as const } : null),
  },
  inner: { padding: 20, paddingBottom: 48 },
  brand: { alignSelf: 'center', marginBottom: 8 },
  h1: { fontSize: 26, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  sub: { color: colors.textSecondary, marginBottom: 20, marginTop: 6, textAlign: 'center' },
  label: { fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  tall: { minHeight: 88, textAlignVertical: 'top' },
  photoPicker: { marginTop: 8, alignSelf: 'stretch' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sportTitle: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize', color: colors.text },
  toggle: { fontSize: 22, color: colors.primary },
  mini: { marginTop: 10, marginBottom: 6, color: colors.textSecondary, fontSize: 13 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: { borderColor: colors.primary, backgroundColor: '#E8F5E9' },
  pillText: { fontSize: 13, color: colors.text, textTransform: 'capitalize' },
  primaryBtn: { marginTop: 28 },
  off: { opacity: 0.6 },
});
