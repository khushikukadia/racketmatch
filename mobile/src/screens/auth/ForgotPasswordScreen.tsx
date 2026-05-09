import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Forgot'>;

export function ForgotPasswordScreen({ navigation }: { navigation: Nav }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.body}>
        Password reset is handled through Supabase Auth. Wire `supabase.auth.resetPasswordForEmail` here
        when your project email templates are ready.
      </Text>
      <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 },
  body: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  btn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: colors.white, fontWeight: '600' },
});
