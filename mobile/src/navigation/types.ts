import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  Forgot: undefined;
  ConfirmEmail: { email?: string; reason?: 'signup' | 'unconfirmed' };
};

export type MainTabParamList = {
  Discover: undefined;
  Matches: undefined;
  Feed: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Main: undefined;
  Chat: { matchId: string; title: string };
  CreatePost: undefined;
  FollowList: { userId: string; mode: 'followers' | 'following'; title: string };
};

export type ChatNavProp = NativeStackNavigationProp<AppStackParamList, 'Chat'>;
