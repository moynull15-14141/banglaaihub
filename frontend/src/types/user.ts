import type { Resource } from './resource';
import type { Badge } from './badge';

export type ProfileVisibility = 'public' | 'private' | 'followers_only';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  reputation_score: number;
  roles: string[];
  created_at: string;
}

// GET /users/me's full response — a strict superset of User (every User
// field is present with the same type), so it's freely assignable wherever
// a User is expected (e.g. authStore.setUser).
export interface OwnProfile extends User {
  bio: string | null;
  headline: string | null;
  cover_image: string | null;
  institution: string | null;
  location: string | null;
  website_url: string | null;
  github_url: string | null;
  gitlab_url: string | null;
  scholar_url: string | null;
  kaggle_url: string | null;
  huggingface_url: string | null;
  linkedin_url: string | null;
  orcid_id: string | null;
  x_url: string | null;
  research_interests: string[];
  skills: string[];
  languages: string[];
  profile_visibility: ProfileVisibility;
  contributor_level: string;
  contributor_next_level: string | null;
  contributor_next_threshold: number | null;
  is_verified: boolean;
  email_verified: boolean;
  follower_count: number;
  following_count: number;
  last_login_at: string | null;
  has_password: boolean;
  has_google: boolean;
  muted_notification_categories: string[];
}

export interface UpdateProfileInput {
  display_name?: string;
  bio?: string;
  headline?: string;
  institution?: string;
  location?: string;
  website_url?: string;
  github_url?: string;
  gitlab_url?: string;
  scholar_url?: string;
  kaggle_url?: string;
  huggingface_url?: string;
  linkedin_url?: string;
  orcid_id?: string;
  x_url?: string;
  research_interests?: string[];
  skills?: string[];
  languages?: string[];
  visibility?: ProfileVisibility;
}

export interface PublicProfileStats {
  total_resources: number;
  total_downloads: number;
  total_views: number;
}

// Mirrors UserService.getPublicProfile() exactly.
export interface PublicProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_image: string | null;
  bio: string | null;
  headline: string | null;
  institution: string | null;
  location: string | null;
  website_url: string | null;
  github_url: string | null;
  gitlab_url: string | null;
  scholar_url: string | null;
  kaggle_url: string | null;
  huggingface_url: string | null;
  linkedin_url: string | null;
  orcid_id: string | null;
  x_url: string | null;
  research_interests: string[];
  skills: string[];
  languages: string[];
  profile_visibility: ProfileVisibility;
  reputation_score: number;
  contributor_level: string;
  contributor_next_level: string | null;
  contributor_next_threshold: number | null;
  is_verified: boolean;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  is_followed_by: boolean;
  is_mutual: boolean;
  badges: Badge[];
  pinned_resources: Resource[];
  resources: Resource[];
  created_at: string;
  stats: PublicProfileStats;
}
