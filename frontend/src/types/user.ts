import type { Resource } from './resource';

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
  institution: string | null;
  location: string | null;
  website_url: string | null;
  github_url: string | null;
  scholar_url: string | null;
  kaggle_url: string | null;
  huggingface_url: string | null;
  linkedin_url: string | null;
  orcid_id: string | null;
  x_url: string | null;
  is_verified: boolean;
  email_verified: boolean;
  last_login_at: string | null;
}

export interface UpdateProfileInput {
  display_name?: string;
  bio?: string;
  institution?: string;
  location?: string;
  website_url?: string;
  github_url?: string;
  scholar_url?: string;
  kaggle_url?: string;
  huggingface_url?: string;
  linkedin_url?: string;
  orcid_id?: string;
  x_url?: string;
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
  bio: string | null;
  institution: string | null;
  location: string | null;
  website_url: string | null;
  github_url: string | null;
  scholar_url: string | null;
  kaggle_url: string | null;
  huggingface_url: string | null;
  linkedin_url: string | null;
  orcid_id: string | null;
  x_url: string | null;
  reputation_score: number;
  is_verified: boolean;
  resources: Resource[];
  stats: PublicProfileStats;
}
