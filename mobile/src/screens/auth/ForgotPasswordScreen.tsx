import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSupabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { buttonStyles } from '../../theme/buttons';
import { AppBrand } from '../../components/AppBrand';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Forgot'>;

export function ForgotPasswordScreen({ navigation }: { navigation: Nav }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const onReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Missing email', 'Enter the email address you used when signing up.');
      return;
    }
    setBusy(true);
    try {
      // IMPORTANT: Make sure Supabase Auth "Redirect URLs" includes your Expo scheme.
      // For example: racketmatch://
      const { error } = await getSupabase().auth.resetPasswordForEmail(trimmed, {
        // Supabase will redirect after the user sets a new password.
        redirectTo: 'racketmatch://',
      });

      if (error) {
        Alert.alert('Reset failed', error.message);
        return;
      }

      Alert.alert('Check your email', 'If an account exists, you will receive a reset link shortly.');
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View>
        <AppBrand size="sm" style={styles.brand} />
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.body}>
          Enter your email and we will send you a reset link (if the account exists).
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Pressable
          style={[buttonStyles.primary, styles.btn, busy && buttonStyles.disabled]}
          onPress={onReset}
          disabled={busy}
        >
          <Text style={buttonStyles.primaryText}>{busy ? 'Sending…' : 'Send reset link'}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.linkMuted}>Back to login</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: 'center', gap: 12 },
  brand: { alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, textAlign: 'center' },
  input: {
    marginTop: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  btn: { marginTop: 24 },
  linkMuted: { color: colors.textSecondary, textAlign: 'center', marginTop: 12 },
});
