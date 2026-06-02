import React, { Suspense, lazy } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createAppStackNavigator, isWebStack, screenLayout } from './createAppStack';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AppBrand } from '../components/AppBrand';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { colors } from '../theme/colors';
import type { AppStackParamList, AuthStackParamList } from './types';

const MainTabs = lazy(() => import('./MainTabs').then((m) => ({ default: m.MainTabs })));
const ChatScreen = lazy(() => import('../screens/ChatScreen').then((m) => ({ default: m.ChatScreen })));
const CreatePostScreen = lazy(() =>
  import('../screens/CreatePostScreen').then((m) => ({ default: m.CreatePostScreen }))
);
const OnboardingScreen = lazy(() =>
  import('../screens/OnboardingScreen').then((m) => ({ default: m.OnboardingScreen }))
);
const FollowListScreen = lazy(() =>
  import('../screens/FollowListScreen').then((m) => ({ default: m.FollowListScreen }))
);

const AuthStack = createAppStackNavigator<AuthStackParamList>();
const AppStack = createAppStackNavigator<AppStackParamList>();
const SetupStack = createAppStackNavigator<{ Setup: undefined }>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.primary,
    text: colors.text,
    card: colors.white,
    border: colors.border,
  },
};

/**
 * On web the JS stack normally lets `document.body` scroll for tall screens, but
 * Expo Web locks the body's height/overflow — so a screen taller than the viewport
 * gets clipped instead of scrolling. Forcing a bounded card height makes the inner
 * ScrollViews scroll. No-op on native (native-stack handles this already).
 */
const webScrollableCard = (
  isWebStack ? { cardStyle: { flex: 1 } } : undefined
) as React.ComponentProps<typeof SetupStack.Navigator>['screenOptions'];

function AuthNavigator() {
  return (
    <AuthStack.Navigator layout={screenLayout} screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="Forgot" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        ...webScrollableCard,
        ...(isWebStack
          ? { headerBackTitle: '' }
          : { headerBackTitleVisible: false, headerBackButtonDisplayMode: 'minimal' }),
        headerTintColor: colors.primary,
      }}
    >
      <AppStack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false, headerBackTitle: '' }}
      />
      <AppStack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} layout={screenLayout} />
      <AppStack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: 'Log session' }}
        layout={screenLayout}
      />
      <AppStack.Screen
        name="FollowList"
        component={FollowListScreen}
        options={{ title: 'Followers' }}
        layout={screenLayout}
      />
    </AppStack.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <SetupStack.Navigator screenOptions={webScrollableCard}>
      <SetupStack.Screen
        name="Setup"
        component={OnboardingScreen}
        options={{ title: 'Your profile' }}
        layout={screenLayout}
      />
    </SetupStack.Navigator>
  );
}

function NavFallback() {
  return (
    <View style={styles.boot}>
      <AppBrand size="md" />
    </View>
  );
}

export function RootNavigator() {
  const { session, loading, profileReady } = useAuth();

  if (loading) {
    return (
      <View style={styles.boot}>
        <AppBrand size="md" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Suspense fallback={<NavFallback />}>
        {!session ? (
          <AuthNavigator />
        ) : profileReady === false ? (
          <OnboardingNavigator />
        ) : (
          <AppNavigator />
        )}
      </Suspense>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
