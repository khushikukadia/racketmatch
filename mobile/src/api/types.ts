export type Sport = 'squash' | 'tennis' | 'pickleball';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type Priority = 'high' | 'medium' | 'low';
export type SwipeDirection = 'like' | 'pass';
export type SessionStatus = 'proposed' | 'accepted' | 'declined' | 'completed';

export interface SportPreference {
  id: string;
  sport: Sport;
  skill_level: SkillLevel;
  priority: Priority;
  preferred_times: string[];
  preferred_locations: string[];
}

export interface Profile {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
  follower_count: number;
  following_count: number;
}

export interface DiscoverProfile extends Profile {
  compatibility_score: number;
  match_reasons: string[];
  sports: SportPreference[];
}

export interface MatchRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
}

export interface MatchWithPreview {
  match: MatchRow;
  other_user: Profile;
  last_message_preview: string | null;
  last_message_at: string | null;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface SessionProposal {
  id: string;
  match_id: string;
  proposed_by_id: string;
  sport: Sport;
  proposed_time: string;
  location: string;
  status: SessionStatus;
  created_at: string;
}

export interface TaggedUserBrief {
  id: string;
  name: string;
  photo_url: string | null;
}

export interface FeedPost {
  id: string;
  user_id: string;
  author: Profile | null;
  sport: Sport;
  caption: string | null;
  location: string | null;
  image_url: string | null;
  played_at: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  tagged_users: TaggedUserBrief[];
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  author: Profile | null;
  body: string;
  created_at: string;
}

export interface SwipeResult {
  recorded: boolean;
  matched: boolean;
  match_id: string | null;
}
