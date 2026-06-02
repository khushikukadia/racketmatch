import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { getSupabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { buttonStyles } from '../../theme/buttons';
import { AppBrand } from '../../components/AppBrand';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ConfirmEmail'>;
type Rt = RouteProp<AuthStackParamList, 'ConfirmEmail'>;

export function ConfirmEmailScreen({ navigation, route }: { navigation: Nav; route: Rt }) {
  const email = route.params?.email;
  const reason = route.params?.reason ?? 'signup';
  const [busy, setBusy] = useState(false);

  const title = reason === 'unconfirmed' ? 'Confirm your sign up' : 'Almost there!';
  const body =
    reason === 'unconfirmed'
      ? 'This account still needs to be confirmed. Go to your email and confirm your sign up, then log in.'
      : 'Go to your email and confirm your sign up. Once you tap the link, come back and log in.';

  const resend = async () => {
    if (!email) {
      Alert.alert('Resend confirmation', 'Head back to log in and try again with your email.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.resend({ type: 'signup', email });
      if (error) {
        Alert.alert('Could not resend', error.message);
      } else {
        Alert.alert('Sent', `We sent a new confirmation link to ${email}.`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppBrand size="sm" style={styles.brand} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {email ? <Text style={styles.email}>{email}</Text> : null}

      <Pressable
        style={[buttonStyles.primary, styles.btn, busy && buttonStyles.disabled]}
        onPress={resend}
        disabled={busy}
      >
        <Text style={buttonStyles.primaryText}>{busy ? 'Sending…' : 'Resend confirmation email'}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Back to login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  brand: { marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  body: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 8,
  },
  email: { fontSize: 15, fontWeight: '700', color: colors.text },
  btn: { marginTop: 12, alignSelf: 'stretch' },
  link: { color: colors.primaryMuted, textAlign: 'center', marginTop: 8, fontSize: 16 },
});
