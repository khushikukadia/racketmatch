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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth, isDevMockAuth } from '../../context/AuthContext';
import { getSupabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { buttonStyles } from '../../theme/buttons';
import { AppBrand } from '../../components/AppBrand';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: { navigation: Nav }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onLogin = async () => {
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        Alert.alert('Login failed', error.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <AppBrand size="md" style={styles.brand} />
        <Text style={styles.tag}>Find your next hit.</Text>
      </View>
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
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        style={[buttonStyles.primary, styles.btn, busy && buttonStyles.disabled]}
        onPress={onLogin}
        disabled={busy}
      >
        <Text style={buttonStyles.primaryText}>{busy ? 'Signing in…' : 'Log in'}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.link}>Create account</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Forgot')}>
        <Text style={styles.linkMuted}>Forgot password</Text>
      </Pressable>
      {isDevMockAuth() ? <DevMockLogin /> : null}
    </KeyboardAvoidingView>
  );
}

function DevMockLogin() {
  const { enterDevMock } = useAuth();
  return (
    <Pressable style={styles.devBox} onPress={enterDevMock}>
      <Text style={styles.devText}>Dev: resume mock session</Text>
    </Pressable>
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
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  brand: { marginBottom: 4 },
  tag: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
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
  link: {
    color: colors.primaryMuted,
    textAlign: 'center',
    marginTop: 8,
    fontSize: 16,
  },
  linkMuted: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
  },
  devBox: {
    marginTop: 24,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFCC80',
  },
  devText: { fontSize: 12, color: '#E65100', textAlign: 'center' },
});
