import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppBrand } from './AppBrand';
import { colors } from '../theme/colors';

export function AppSplash() {
  return (
    <View style={styles.root}>
      <AppBrand size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});
