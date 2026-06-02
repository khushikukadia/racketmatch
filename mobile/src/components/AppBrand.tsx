import React from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

const logo = require('../../assets/racketmatch-logo.png');

type Props = {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  style?: ViewStyle;
};

const LOGO_SIZE = { sm: 72, md: 112, lg: 160 } as const;
const NAME_SIZE = { sm: 20, md: 24, lg: 32 } as const;

export function AppBrand({ size = 'md', showName = true, style }: Props) {
  const logoSize = LOGO_SIZE[size];
  const nameSize = NAME_SIZE[size];

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={logo}
        style={{ width: logoSize, height: logoSize, marginBottom: -4 }}
        resizeMode="contain"
      />
      {showName ? (
        <Text style={[styles.name, { fontSize: nameSize, lineHeight: nameSize + 4, marginTop: -2 }]}>
          SmashOrPass
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 16,
  },
  name: {
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
});
