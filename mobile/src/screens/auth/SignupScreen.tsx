import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSupabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { buttonStyles } from '../../theme/buttons';
import { AppBrand } from '../../components/AppBrand';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: { navigation: Nav }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSignup = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert('Missing info', 'Enter both an email and a password to continue.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Your password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await getSupabase().auth.signUp({ email: trimmedEmail, password });
      if (error) {
        Alert.alert('Signup failed', error.message);
        return;
      }
      // Supabase's enumeration protection returns a "fake" success for an email
      // that already exists: no error, no session, and an empty identities array.
      // No confirmation email is sent in that case, so steer the user to log in.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        Alert.alert(
          'Account already exists',
          'That email is already registered. Try logging in instead.'
        );
        return;
      }
      // When email confirmation is required, Supabase returns no active session.
      // If a session exists, the auth listener will swap navigators automatically.
      if (!data.session) {
        navigation.navigate('ConfirmEmail', { email: trimmedEmail, reason: 'signup' });
      }
    } catch (e) {
      // signUp() throws (rather than returning an error) on network failures, so
      // surface it instead of silently swallowing it and leaving the button dead.
      Alert.alert(
        'Signup failed',
        e instanceof Error ? e.message : 'Network error. Check your connection and try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppBrand size="sm" style={styles.brand} />
      <Text style={styles.title}>Create your account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6)"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        style={[buttonStyles.primary, styles.btn, busy && buttonStyles.disabled]}
        onPress={onSignup}
        disabled={busy}
      >
        <Text style={buttonStyles.primaryText}>{busy ? 'Creating…' : 'Sign up'}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Back to login</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  brand: { alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: 12, textAlign: 'center' },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  btn: { marginTop: 8 },
  link: { color: colors.primaryMuted, textAlign: 'center', marginTop: 12 },
});
