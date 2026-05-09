import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { MatchWithPreview, Sport } from '../api/types';
import { colors } from '../theme/colors';
import type { AppStackParamList } from '../navigation/types';

const SPORTS: Sport[] = ['tennis', 'squash', 'pickleball'];

type Nav = NativeStackNavigationProp<AppStackParamList, 'CreatePost'>;

export function CreatePostScreen({ navigation }: { navigation: Nav }) {
  const { apiToken } = useAuth();
  const [sport, setSport] = useState<Sport>('tennis');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [matches, setMatches] = useState<MatchWithPreview[]>([]);
  const [tags, setTags] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getMatches(apiToken).then(setMatches);
  }, [apiToken]);

  const toggleTag = (id: string) => setTags((t) => ({ ...t, [id]: !t[id] }));

  const submit = async () => {
    setBusy(true);
    try {
      const tagged_user_ids = Object.entries(tags)
        .filter(([, v]) => v)
        .map(([k]) => k);
      await api.createPost(apiToken, {
        sport,
        caption: caption.trim() || null,
        location: location.trim() || null,
        image_url: imageUrl.trim() || null,
        played_at: new Date().toISOString(),
        tagged_user_ids,
      });
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.inner}>
      <Text style={styles.label}>Sport</Text>
      <View style={styles.row}>
        {SPORTS.map((s) => (
          <Pressable
            key={s}
            style={[styles.pill, sport === s && styles.pillOn]}
            onPress={() => setSport(s)}
          >
            <Text style={styles.pillText}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Caption</Text>
      <TextInput
        style={[styles.input, styles.tall]}
        value={caption}
        onChangeText={setCaption}
        placeholder="How did it go?"
        multiline
      />
      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} />
      <Text style={styles.label}>Image URL (optional)</Text>
      <TextInput style={styles.input} value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />
      <Text style={styles.label}>Tag match partners</Text>
      {matches.map((m) => (
        <Pressable key={m.match.id} style={styles.tagRow} onPress={() => toggleTag(m.other_user.id)}>
          <Text style={styles.tagText}>
            {tags[m.other_user.id] ? '☑' : '☐'} {m.other_user.name}
          </Text>
        </Pressable>
      ))}
      <Pressable style={[styles.btn, busy && styles.off]} onPress={submit} disabled={busy}>
        <Text style={styles.btnText}>{busy ? 'Posting…' : 'Post to feed'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  inner: { padding: 16, paddingBottom: 40 },
  label: { fontWeight: '600', marginTop: 14, marginBottom: 8, color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: { borderColor: colors.primary, backgroundColor: '#E8F5E9' },
  pillText: { textTransform: 'capitalize', color: colors.text },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  tall: { minHeight: 100, textAlignVertical: 'top' },
  tagRow: { paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
  tagText: { fontSize: 16, color: colors.text },
  btn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 17 },
  off: { opacity: 0.6 },
});
