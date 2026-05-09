import React, { Suspense, lazy } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
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

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const SetupStack = createNativeStackNavigator<{ Setup: undefined }>();

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

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="Forgot" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator>
      <AppStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <AppStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Chat', headerBackTitle: 'Matches' }}
      />
      <AppStack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: 'Log session' }} />
      <AppStack.Screen
        name="FollowList"
        component={FollowListScreen}
        options={{ title: 'Followers', headerBackTitle: 'Profile' }}
      />
    </AppStack.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <SetupStack.Navigator>
      <SetupStack.Screen
        name="Setup"
        component={OnboardingScreen}
        options={{ title: 'Your profile' }}
      />
    </SetupStack.Navigator>
  );
}

function NavFallback() {
  return (
    <View style={styles.boot}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function RootNavigator() {
  const { session, loading, profileReady } = useAuth();

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
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
