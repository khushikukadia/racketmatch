import type {
  Comment,
  DiscoverProfile,
  FeedPost,
  MatchRow,
  MatchWithPreview,
  Message,
  Priority,
  Profile,
  SessionProposal,
  SessionStatus,
  SkillLevel,
  Sport,
  SwipeDirection,
  SwipeResult,
  SportPreference,
} from './types';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
const DEV_MOCK = process.env.EXPO_PUBLIC_DEV_MOCK_AUTH === 'true';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...rest } = init;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(rest.headers as Record<string, string>),
  };
  if (rest.body && typeof rest.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token && !DEV_MOCK) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...rest, headers });
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}`, res.status, text);
  }
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export const api = {
  getProfileMe(token: string | null) {
    return request<Profile>('/profiles/me', { token });
  },

  updateProfile(
    token: string | null,
    body: { name?: string; bio?: string | null; photo_url?: string | null; city?: string | null }
  ) {
    return request<Profile>('/profiles/me', {
      method: 'PUT',
      token,
      body: JSON.stringify(body),
    });
  },

  updateSports(token: string | null, sports: SportPreferenceInput[]) {
    return request<SportPreference[]>('/profiles/me/sports', {
      method: 'PUT',
      token,
      body: JSON.stringify(sports),
    });
  },

  getDiscover(token: string | null) {
    return request<DiscoverProfile[]>('/profiles/discover', { token });
  },

  getProfile(token: string | null, userId: string) {
    return request<Profile>(`/profiles/${userId}`, { token });
  },

  getUserSports(token: string | null, userId: string) {
    return request<SportPreference[]>(`/profiles/${userId}/sports`, { token });
  },

  getUserPosts(token: string | null, userId: string) {
    return request<FeedPost[]>(`/profiles/${userId}/posts`, { token });
  },

  postSwipe(token: string | null, swiped_user_id: string, direction: SwipeDirection) {
    return request<SwipeResult>('/swipes', {
      method: 'POST',
      token,
      body: JSON.stringify({ swiped_user_id, direction }),
    });
  },

  getMatches(token: string | null) {
    return request<MatchWithPreview[]>('/matches', { token });
  },

  getMatch(token: string | null, matchId: string) {
    return request<MatchRow>(`/matches/${matchId}`, { token });
  },

  getMessages(token: string | null, matchId: string) {
    return request<Message[]>(`/matches/${matchId}/messages`, { token });
  },

  sendMessage(token: string | null, matchId: string, body: string) {
    return request<Message>(`/matches/${matchId}/messages`, {
      method: 'POST',
      token,
      body: JSON.stringify({ body }),
    });
  },

  getProposals(token: string | null, matchId: string) {
    return request<SessionProposal[]>(`/matches/${matchId}/proposals`, { token });
  },

  createProposal(
    token: string | null,
    matchId: string,
    body: { sport: Sport; proposed_time: string; location: string }
  ) {
    return request<SessionProposal>(`/matches/${matchId}/proposals`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    });
  },

  updateProposal(token: string | null, proposalId: string, status: SessionStatus) {
    return request<SessionProposal>(`/proposals/${proposalId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    });
  },

  getFeed(token: string | null) {
    return request<FeedPost[]>('/feed', { token });
  },

  createPost(
    token: string | null,
    body: {
      sport: Sport;
      caption?: string | null;
      location?: string | null;
      image_url?: string | null;
      played_at: string;
      tagged_user_ids: string[];
    }
  ) {
    return request<FeedPost>('/posts', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    });
  },

  likePost(token: string | null, postId: string) {
    return request<void>(`/posts/${postId}/like`, { method: 'POST', token });
  },

  unlikePost(token: string | null, postId: string) {
    return request<void>(`/posts/${postId}/like`, { method: 'DELETE', token });
  },

  getComments(token: string | null, postId: string) {
    return request<Comment[]>(`/posts/${postId}/comments`, { token });
  },

  addComment(token: string | null, postId: string, body: string) {
    return request<Comment>(`/posts/${postId}/comments`, {
      method: 'POST',
      token,
      body: JSON.stringify({ body }),
    });
  },

  follow(token: string | null, userId: string) {
    return request<void>(`/profiles/${userId}/follow`, { method: 'POST', token });
  },

  unfollow(token: string | null, userId: string) {
    return request<void>(`/profiles/${userId}/follow`, { method: 'DELETE', token });
  },

  getFollowers(token: string | null, userId: string) {
    return request<Profile[]>(`/profiles/${userId}/followers`, { token });
  },

  getFollowing(token: string | null, userId: string) {
    return request<Profile[]>(`/profiles/${userId}/following`, { token });
  },
};

export interface SportPreferenceInput {
  sport: Sport;
  skill_level: SkillLevel;
  priority: Priority;
  preferred_times: string[];
  preferred_locations: string[];
}
