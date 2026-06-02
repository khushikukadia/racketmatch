import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';

/** Native stack on iOS/Android; JS stack on web (native-stack is not supported on web). */
export const createAppStackNavigator =
  Platform.OS === 'web' ? createStackNavigator : createNativeStackNavigator;

export const isWebStack = Platform.OS === 'web';

/** Max content width on web so screens fill the page width but content stays centered/readable. */
const WEB_CONTENT_MAX_WIDTH = 400;

/**
 * Web-only screen layout: the screen background fills the full page width while the
 * content is centered and capped to a readable column. No-op (undefined) on native,
 * so iOS/Android keep their default full-screen behavior.
 */
export const screenLayout =
  Platform.OS === 'web'
    ? ({ children }: { children: React.ReactNode }) => (
        <View style={styles.webScene}>{children}</View>
      )
    : undefined;

const styles = StyleSheet.create({
  webScene: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
});
